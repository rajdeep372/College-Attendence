declare module "react-barcode" {
  import React from "react";
  export interface BarcodeProps {
    value: string;
    format?:
      | "CODE128"
      | "CODE128A"
      | "CODE128B"
      | "CODE128C"
      | "EAN13"
      | "UPC"
      | "EAN8"
      | "EAN5"
      | "EAN2"
      | "CODE39"
      | "ITF14"
      | "MSI"
      | "pharmacode"
      | "codabar";
    width?: number;
    height?: number;
    displayValue?: boolean;
    text?: string;
    fontOptions?: string;
    font?: string;
    textAlign?: "left" | "center" | "right";
    textPosition?: "top" | "bottom";
    textMargin?: number;
    fontSize?: number;
    background?: string;
    lineColor?: string;
    margin?: number;
    marginTop?: number;
    marginBottom?: number;
    marginLeft?: number;
    marginRight?: number;
  }
  const Barcode: React.FC<BarcodeProps>;
  export default Barcode;
}
