import assert from "node:assert/strict";
import test from "node:test";
import { createProducer, updateProducer } from "../../lib/db";
import type { Producer } from "../../types";

const producer: Producer = {
  id: "producer-test",
  displayName: "Productor ficticio",
  rfc: "XAXX010101004",
  zona: "Distrito demo",
  contacto: "",
  email: "",
  phone: "",
  status: "PENDIENTE",
  cultivo: "RASP",
  distrito: "Distrito demo",
  nombreAreaCultivo: "Área ficticia",
  productor: "Productor ficticio",
  idCofibeCg: "DEMO",
  numeroProductor: "900001",
  razonSocial: "Persona ficticia",
  representanteLegal: "",
  direccionFiscal: "Av. Ejemplo 1",
  colonia: "",
  municipio: "Morelia",
  estado: "Michoacán",
  codigoPostal: "58000",
  nombreContacto: "",
  telefonoContacto: "",
  numeroCelular: "",
  correoElectronico: "",
  correoElectronicoProductor: "",
};

function rowFromProducer(input: Producer) {
  return {
    id: input.id, display_name: input.displayName, rfc: input.rfc, zona: input.zona,
    contacto: input.contacto, email: input.email, phone: input.phone, status: input.status,
    profile: {}, cultivo: input.cultivo, distrito: input.distrito,
    nombre_area_cultivo: input.nombreAreaCultivo, productor: input.productor,
    id_cofibe_cg: input.idCofibeCg, numero_productor: input.numeroProductor,
    razon_social: input.razonSocial, representante_legal: input.representanteLegal,
    direccion_fiscal: input.direccionFiscal, colonia: input.colonia, municipio: input.municipio,
    estado: input.estado, codigo_postal: input.codigoPostal, nombre_contacto: input.nombreContacto,
    telefono_contacto: input.telefonoContacto, numero_celular: input.numeroCelular,
    correo_electronico: input.correoElectronico,
    correo_electronico_productor: input.correoElectronicoProductor,
  };
}

test("createProducer persists and maps every typed import field", async () => {
  let capturedSql = "";
  let capturedValues: unknown[] = [];
  const db = {
    query: async (sql: string, values?: unknown[]) => {
      capturedSql = sql;
      capturedValues = values ?? [];
      return { rows: [rowFromProducer(producer)], rowCount: 1 };
    },
  };
  const result = await createProducer(producer, db as never);
  for (const column of ["cultivo", "numero_productor", "codigo_postal", "correo_electronico_productor"]) {
    assert.match(capturedSql, new RegExp(`\\b${column}\\b`));
  }
  assert.equal(capturedValues.includes("900001"), true);
  assert.equal(result?.numeroProductor, "900001");
  assert.equal(result?.codigoPostal, "58000");
  assert.equal(result?.status, "PENDIENTE");
});

test("updateProducer writes typed import fields instead of dropping them", async () => {
  let capturedSql = "";
  const db = {
    query: async (sql: string) => {
      capturedSql = sql;
      return { rows: [rowFromProducer({ ...producer, numeroProductor: "900002" })], rowCount: 1 };
    },
  };
  const result = await updateProducer(producer.id, { numeroProductor: "900002", codigoPostal: "58001" }, db as never);
  assert.match(capturedSql, /numero_productor = /);
  assert.match(capturedSql, /codigo_postal = /);
  assert.equal(result?.numeroProductor, "900002");
});