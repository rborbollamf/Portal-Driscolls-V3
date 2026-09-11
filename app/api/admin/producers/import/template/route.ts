import { NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { requireAuth } from "@/lib/auth/middleware";
import { PRODUCER_IMPORT_HEADERS } from "@/lib/services/producer-import";

export const runtime = "nodejs";

export async function GET() {
  const auth = await requireAuth(["ADMIN"]);
  if (!auth.authorized) return auth.response;
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("ALL complete Data Base");
  sheet.addRow([...PRODUCER_IMPORT_HEADERS]);
  sheet.addRow(["RASP","DISTRITO DEMO","ÁREA FICTICIA","PRODUCTOR FICTICIO","DEMO-001","900001","EMPRESA FICTICIA","ANA PÉREZ","AV. EJEMPLO 1","CENTRO","MORELIA","Michoacán","58000","XAXX010101004","CONTACTO FICTICIO","4431234567","4431234567","ficticio@example.com","productor.ficticio@example.com"]);
  sheet.getRow(1).font = { bold: true };
  sheet.views = [{ state: "frozen", ySplit: 1 }];
  sheet.columns.forEach((column) => { column.width = 24; });
  const buffer = await workbook.xlsx.writeBuffer();
  return new NextResponse(buffer as BodyInit, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": 'attachment; filename="plantilla-productores.xlsx"',
    },
  });
}