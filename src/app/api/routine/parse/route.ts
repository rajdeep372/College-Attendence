import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { connectToDatabase } from "@/lib/mongodb";
import Routine from "@/models/Routine";
import User from "@/models/User";

interface ParsedScheduleItem {
  dayOfWeek: "Monday" | "Tuesday" | "Wednesday" | "Thursday" | "Friday" | "Saturday";
  timeSlot: string;
  paperCode?: string;
  subject: string;
  teacher: string;
  semester: number;
  academicYear?: string;
  section?: string;
  department: string;
}

export async function POST(req: NextRequest) {
  try {
    await connectToDatabase();

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const customDepartment = (formData.get("department") as string) || "Bachelor of Computer Applications (BCA)";
    const customSemester = Number(formData.get("semester")) || 5;
    const customAcademicYear = (formData.get("academicYear") as string) || (customSemester <= 2 ? "1st Year" : customSemester <= 4 ? "2nd Year" : customSemester <= 6 ? "3rd Year" : "4th Year");
    const customSection = (formData.get("section") as string) || "Section A";
    const shouldSave = formData.get("save") !== "false"; // Default true

    if (!file) {
      return NextResponse.json(
        { success: false, error: "No timetable document or image provided." },
        { status: 400 }
      );
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const mimeType = file.type || "image/jpeg";
    const base64Data = buffer.toString("base64");

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey.includes("your_gemini") || apiKey.length < 10) {
      return NextResponse.json(
        { 
          success: false, 
          error: "GEMINI_API_KEY is not configured in .env.local. Please provide a valid Gemini API key to enable OCR vision timetable parsing." 
        },
        { status: 400 }
      );
    }

    let parsedSchedules: ParsedScheduleItem[] = [];
    const genAI = new GoogleGenerativeAI(apiKey);

    const prompt = `You are a strict Optical Character Recognition (OCR) data extractor. You must ONLY extract the exact text visible in the uploaded image. DO NOT invent, guess, or generate any dummy names, subjects, or paper codes. If a faculty name is "Mr. Falguni Adhikary", you must output exactly that.

Your task is to analyze this official college routine/timetable image:

1. TOP MAIN TIMETABLE GRID:
   - Rows: Days of the week (Monday, Tuesday, Wednesday, Thursday, Friday, Saturday).
   - Columns: Time slots / periods (e.g., 10:00 AM - 11:00 AM, 11:00 AM - 12:00 PM, 12:00 PM - 01:00 PM, 02:00 PM - 04:00 PM, etc.).
   - Grid cells contain Paper Codes (e.g., BCAC501, BCAC502, BCA591, etc.) and sometimes room numbers or teacher initials.
   - EXCLUDE MERGED BREAKS: If any period/column is marked "BREAK", "RECESS", "LUNCH", "TIFFIN", or empty, DO NOT output any break entries.
   - MULTI-SLOT LABS: If a laboratory class spans two consecutive time slots (e.g., 02:00 PM - 04:00 PM), combine them into a single session with the complete time slot.

2. SECONDARY MAPPING TABLE AT THE BOTTOM OF THE IMAGE:
   - Carefully read the secondary mapping table / legend at the bottom of the image.
   - It maps each Paper Code to its exact Paper/Subject Name (e.g., "Introduction to Machine Learning", "Advanced Python Lab", etc.) and the exact assigned Faculty/Teacher Name (e.g., "Mr. Falguni Adhikary", "Dr. A. Roy", etc.).
   - You MUST cross-reference every Paper Code found in the main timetable grid with this bottom table to resolve the exact Paper Name and exact Faculty Name.

STRICT EXTRACTION RULES:
- NEVER hallucinate or substitute standard placeholder courses (e.g., do NOT output "Cloud Computing" or "Dr. S. Mukherjee" unless those exact words appear in this image).
- If a faculty name is "Mr. Falguni Adhikary", output exactly "Mr. Falguni Adhikary".
- If a subject name is "Introduction to Machine Learning", output exactly "Introduction to Machine Learning" (or prefixed with its paper code).
- Enforce strict JSON output format matching this exact schema:
[
  {
    "dayOfWeek": "Monday" | "Tuesday" | "Wednesday" | "Thursday" | "Friday" | "Saturday",
    "timeSlot": "e.g. 10:00 AM - 11:00 AM",
    "paperCode": "exact paper code e.g. BCAC501",
    "subject": "exact paper name from bottom mapping table e.g. Introduction to Machine Learning",
    "teacher": "exact faculty name from bottom mapping table e.g. Mr. Falguni Adhikary",
    "semester": ${customSemester},
    "academicYear": "${customAcademicYear}",
    "section": "${customSection}",
    "department": "${customDepartment}"
  }
]

Do not include markdown fences or explanatory text. Return ONLY the raw JSON array.`;

    const imagePart = {
      inlineData: {
        data: base64Data,
        mimeType: mimeType,
      },
    };

    // Candidate Gemini Vision models in order of capability and availability
    const candidateModels = ["gemini-2.5-flash", "gemini-2.0-flash", "gemini-2.5-pro"];
    let lastError: Error | null = null;
    let extractionSucceeded = false;

    for (const modelName of candidateModels) {
      try {
        console.log(`[Smart AI Routine Parser] Attempting OCR Vision extraction with model: ${modelName}...`);
        const model = genAI.getGenerativeModel({
          model: modelName,
          generationConfig: {
            responseMimeType: "application/json",
          },
        });

        const result = await model.generateContent([prompt, imagePart]);
        const responseText = result.response.text();
        const jsonMatch = responseText.match(/\[[\s\S]*\]/);
        const parsed = JSON.parse(jsonMatch ? jsonMatch[0] : responseText);

        if (Array.isArray(parsed) && parsed.length > 0) {
          parsedSchedules = parsed;
          extractionSucceeded = true;
          console.log(`[Smart AI Routine Parser] Successfully extracted ${parsed.length} lectures using ${modelName}.`);
          break;
        }
      } catch (err: unknown) {
        lastError = err instanceof Error ? err : new Error(String(err));
        console.warn(`[Smart AI Routine Parser] Model ${modelName} failed:`, lastError.message);
      }
    }

    if (!extractionSucceeded || parsedSchedules.length === 0) {
      const errorMsg = lastError?.message || "Could not detect or extract timetable cells from the uploaded image.";
      return NextResponse.json(
        {
          success: false,
          error: `AI OCR Extraction Error: ${errorMsg}. Please ensure the uploaded image has clear contrast and visible timetable rows and mapping tables.`,
        },
        { status: 422 }
      );
    }

    // Standardize days of week, time slots, and formats
    const validDays = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    parsedSchedules = parsedSchedules
      .filter((item) => {
        const subj = (item.subject || "").toLowerCase();
        // Discard any breaks or lunches
        return !subj.includes("break") && !subj.includes("recess") && !subj.includes("lunch") && !subj.includes("tiffin");
      })
      .map((item) => {
        const rawDay = item.dayOfWeek || "Monday";
        const matchedDay = validDays.find((d) => d.toLowerCase() === rawDay.toLowerCase()) || "Monday";
        const cleanPaperCode = (item.paperCode || "").trim();
        let cleanSubject = (item.subject || cleanPaperCode || "Scheduled Class").trim();

        // If paperCode is not prefixed and is available, prefix for maximum clarity
        if (cleanPaperCode && !cleanSubject.startsWith(cleanPaperCode)) {
          cleanSubject = `${cleanPaperCode} - ${cleanSubject}`;
        }

        return {
          dayOfWeek: matchedDay as ParsedScheduleItem["dayOfWeek"],
          department: item.department || customDepartment,
          academicYear: item.academicYear || customAcademicYear,
          semester: Number(item.semester) || customSemester,
          section: item.section || customSection,
          timeSlot: (item.timeSlot || "10:00 AM - 11:00 AM").trim(),
          paperCode: cleanPaperCode,
          subject: cleanSubject,
          teacher: (item.teacher || "Faculty Instructor").trim(),
        };
      });

    // If shouldSave is true, save directly into MongoDB Routine collection
    let insertedRoutines: any[] = [];
    if (shouldSave && parsedSchedules.length > 0) {
      // 1. Clean existing routines strictly for this specific department, semester & section to prevent stale duplicates
      await Routine.deleteMany({
        department: customDepartment,
        semester: customSemester,
        section: customSection,
      });

      // 2. Prepare routine documents with valid Teacher User ObjectIds
      const routineDocs = await Promise.all(
        parsedSchedules.map(async (item) => {
          const cleanTeacherName = item.teacher.replace(/^(Dr\.|Prof\.|Mr\.|Ms\.)\s*/i, "").trim();

          // Attempt to find existing teacher by name or role
          let teacherDoc = await User.findOne({
            role: "Teacher",
            name: new RegExp(cleanTeacherName || "Faculty", "i"),
          });

          // Auto-provision teacher if not present in MongoDB
          if (!teacherDoc) {
            const emailSlug = cleanTeacherName.toLowerCase().replace(/[^a-z0-9]/g, ".") || "faculty";
            teacherDoc = await User.create({
              clerkId: `teacher_auto_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
              name: item.teacher,
              email: `${emailSlug}@academiasync.edu`,
              role: "Teacher",
              department: customDepartment,
              designation: "Faculty Instructor",
              onboarded: true,
            });
          }

          return {
            department: item.department,
            academicYear: customAcademicYear,
            semester: item.semester,
            section: customSection,
            dayOfWeek: item.dayOfWeek,
            paperCode: item.paperCode,
            subject: item.subject,
            timeSlot: item.timeSlot,
            teacherId: teacherDoc._id,
          };
        })
      );

      // 3. Bulk insert into MongoDB
      insertedRoutines = await Routine.insertMany(routineDocs);
      console.log(`[Smart AI Routine Parser] Inserted ${insertedRoutines.length} resolved routine records into MongoDB for ${customDepartment} (${customSection}).`);
    }

    return NextResponse.json({
      success: true,
      message: `Successfully extracted and linked ${parsedSchedules.length} classes from uploaded timetable.`,
      count: parsedSchedules.length,
      savedToDatabase: shouldSave,
      data: parsedSchedules,
      insertedCount: insertedRoutines.length,
      department: customDepartment,
      academicYear: customAcademicYear,
      semester: customSemester,
      section: customSection,
    });
  } catch (error: unknown) {
    console.error("[API: /api/routine/parse] Error:", error);
    const message = error instanceof Error ? error.message : "Failed to parse college routine";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    await connectToDatabase();

    const { searchParams } = new URL(req.url);
    const department = searchParams.get("department");
    const semester = searchParams.get("semester");
    const section = searchParams.get("section");
    const academicYear = searchParams.get("academicYear");

    const query: Record<string, unknown> = {};
    if (department) {
      query.department = department;
    }
    if (semester) {
      query.semester = Number(semester);
    }
    if (section) {
      query.section = section;
    }
    if (academicYear) {
      query.academicYear = academicYear;
    }

    const routines = await Routine.find(query)
      .populate("teacherId", "name email")
      .sort({ dayOfWeek: 1, timeSlot: 1 })
      .lean();

    return NextResponse.json({
      success: true,
      count: routines.length,
      routines,
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Error fetching routines";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
