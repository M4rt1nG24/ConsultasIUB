import { Injectable, inject } from '@angular/core';
import { ConsultaUnificada, UsuarioSistema } from '../models/consulta.models';
import { Data } from './data';
import { TEMPLATE_FILES_FR_GPA_16 } from './fr-gpa-16-template';

export interface DocenteReporteData {
  docenteId?: number;
  docenteNombre: string;
  programaNombre: string;
  consultas: ConsultaUnificada[];
}

export type TipoLapsoReporte = 'MES' | 'PERIODO';

export interface ConfiguracionReporteConsultas {
  tipoLapso: TipoLapsoReporte;
  anio: number;
  mes: number; // 1 - 12
  periodoCuatrimestre: number; // 1: Ene-Abr, 2: May-Ago, 3: Sep-Dic
  fechaInicio?: string;
  fechaFin?: string;
  soloCompletadas: boolean;
  todosDocentes: boolean;
  docentesSeleccionadosIds: number[];
}

export interface MesOpcion {
  valor: number;
  nombre: string;
}

export interface PeriodoOpcion {
  valor: number;
  nombre: string;
  mesesTexto: string;
  fechaInicio: string;
  fechaFin: string;
}

interface ZipFileEntry {
  name: string;
  data: Uint8Array;
}

// Tabla CRC32 precalculada para rendimiento óptimo
const CRC_TABLE = new Uint32Array(256);
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) {
    c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
  }
  CRC_TABLE[n] = c;
}

function calcularCrc32(bytes: Uint8Array): number {
  let crc = 0 ^ (-1);
  for (let i = 0; i < bytes.length; i++) {
    crc = (crc >>> 8) ^ CRC_TABLE[(crc ^ bytes[i]) & 0xFF];
  }
  return (crc ^ (-1)) >>> 0;
}

const TEXT_ENCODER = new TextEncoder();

function stringAUint8(str: string): Uint8Array {
  return TEXT_ENCODER.encode(str);
}

function base64AUint8(base64: string): Uint8Array {
  let binStr = '';
  if (typeof atob === 'function') {
    binStr = atob(base64);
  } else if (typeof globalThis !== 'undefined' && (globalThis as unknown as { Buffer?: { from: (b: string, enc: string) => { toString: (e: string) => string } } }).Buffer) {
    binStr = (globalThis as unknown as { Buffer: { from: (b: string, enc: string) => { toString: (e: string) => string } } }).Buffer.from(base64, 'base64').toString('binary');
  }
  const len = binStr.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binStr.charCodeAt(i);
  }
  return bytes;
}

/**
 * Empaqueta un conjunto de archivos en un contenedor ZIP estándar (Store / no compression),
 * generando un archivo compatible al 100% con Microsoft Excel y OpenXML (.xlsx).
 */
function empaquetarZip(archivos: ZipFileEntry[]): Uint8Array {
  const encabezadosLocales: Uint8Array[] = [];
  const encabezadosCentrales: Uint8Array[] = [];
  let desplazamiento = 0;

  for (const arch of archivos) {
    const nombreBytes = stringAUint8(arch.name);
    const datosBytes = arch.data;
    const crc = calcularCrc32(datosBytes);
    const tamano = datosBytes.length;

    // Encabezado de archivo local (30 bytes + longitud del nombre)
    const lh = new Uint8Array(30 + nombreBytes.length);
    const dvLh = new DataView(lh.buffer, lh.byteOffset, lh.byteLength);
    dvLh.setUint32(0, 0x04034b50, true); // Firma Local File Header
    dvLh.setUint16(4, 20, true);         // Versión necesaria para extraer (2.0)
    dvLh.setUint16(6, 0x0800, true);     // Flags (UTF-8 activado)
    dvLh.setUint16(8, 0, true);          // Método de compresión: 0 (Store)
    dvLh.setUint32(10, 0, true);         // Mod time / date
    dvLh.setUint32(14, crc, true);        // CRC-32
    dvLh.setUint32(18, tamano, true);     // Tamaño comprimido
    dvLh.setUint32(22, tamano, true);     // Tamaño descomprimido
    dvLh.setUint16(26, nombreBytes.length, true); // Longitud del nombre
    dvLh.setUint16(28, 0, true);          // Longitud campo extra
    lh.set(nombreBytes, 30);

    encabezadosLocales.push(lh, datosBytes);

    // Encabezado del Directorio Central (46 bytes + longitud del nombre)
    const ch = new Uint8Array(46 + nombreBytes.length);
    const dvCh = new DataView(ch.buffer, ch.byteOffset, ch.byteLength);
    dvCh.setUint32(0, 0x02014b50, true); // Firma Central Directory Header
    dvCh.setUint16(4, 20, true);         // Versión hecha por
    dvCh.setUint16(6, 20, true);         // Versión necesaria
    dvCh.setUint16(8, 0x0800, true);     // Flags (UTF-8 activado)
    dvCh.setUint16(10, 0, true);         // Método de compresión (0)
    dvCh.setUint32(12, 0, true);         // Mod time / date
    dvCh.setUint32(16, crc, true);        // CRC-32
    dvCh.setUint32(20, tamano, true);     // Tamaño comprimido
    dvCh.setUint32(24, tamano, true);     // Tamaño descomprimido
    dvCh.setUint16(28, nombreBytes.length, true); // Longitud nombre
    dvCh.setUint16(30, 0, true);         // Campo extra
    dvCh.setUint16(32, 0, true);         // Comentario
    dvCh.setUint16(34, 0, true);         // Disco
    dvCh.setUint16(36, 0, true);         // Atributos internos
    dvCh.setUint32(38, 0, true);         // Atributos externos
    dvCh.setUint32(42, desplazamiento, true); // Desplazamiento del archivo local
    ch.set(nombreBytes, 46);

    encabezadosCentrales.push(ch);
    desplazamiento += lh.length + datosBytes.length;
  }

  const offsetCentral = desplazamiento;
  let tamanoCentral = 0;
  for (const c of encabezadosCentrales) {
    tamanoCentral += c.length;
  }

  // Fin del registro del Directorio Central (EOCD - 22 bytes)
  const eocd = new Uint8Array(22);
  const dvEo = new DataView(eocd.buffer, eocd.byteOffset, eocd.byteLength);
  dvEo.setUint32(0, 0x06054b50, true); // Firma EOCD
  dvEo.setUint16(4, 0, true);          // Número de disco
  dvEo.setUint16(6, 0, true);          // Disco donde empieza el directorio central
  dvEo.setUint16(8, archivos.length, true);  // Número de entradas en este disco
  dvEo.setUint16(10, archivos.length, true); // Total de entradas
  dvEo.setUint32(12, tamanoCentral, true);   // Tamaño del directorio central
  dvEo.setUint32(16, offsetCentral, true);   // Desplazamiento del directorio central
  dvEo.setUint16(20, 0, true);         // Longitud de comentario (0)

  const todasLasPartes = [...encabezadosLocales, ...encabezadosCentrales, eocd];
  let longitudTotal = 0;
  for (const parte of todasLasPartes) {
    longitudTotal += parte.length;
  }

  const salida = new Uint8Array(longitudTotal);
  let cursor = 0;
  for (const parte of todasLasPartes) {
    salida.set(parte, cursor);
    cursor += parte.length;
  }

  return salida;
}

@Injectable({
  providedIn: 'root'
})
export class ReporteExcelService {
  private dataService = inject(Data);

  readonly MESES: MesOpcion[] = [
    { valor: 1, nombre: 'Enero' },
    { valor: 2, nombre: 'Febrero' },
    { valor: 3, nombre: 'Marzo' },
    { valor: 4, nombre: 'Abril' },
    { valor: 5, nombre: 'Mayo' },
    { valor: 6, nombre: 'Junio' },
    { valor: 7, nombre: 'Julio' },
    { valor: 8, nombre: 'Agosto' },
    { valor: 9, nombre: 'Septiembre' },
    { valor: 10, nombre: 'Octubre' },
    { valor: 11, nombre: 'Noviembre' },
    { valor: 12, nombre: 'Diciembre' }
  ];

  obtenerPeriodosCuatrimestre(anio: number): PeriodoOpcion[] {
    return [
      {
        valor: 1,
        nombre: `Periodo ${anio}-1`,
        mesesTexto: 'Enero a Abril (4 meses)',
        fechaInicio: `${anio}-01-01`,
        fechaFin: `${anio}-04-30`
      },
      {
        valor: 2,
        nombre: `Periodo ${anio}-2`,
        mesesTexto: 'Mayo a Agosto (4 meses)',
        fechaInicio: `${anio}-05-01`,
        fechaFin: `${anio}-08-31`
      },
      {
        valor: 3,
        nombre: `Periodo ${anio}-3`,
        mesesTexto: 'Septiembre a Diciembre (4 meses)',
        fechaInicio: `${anio}-09-01`,
        fechaFin: `${anio}-12-31`
      }
    ];
  }

  obtenerRangoFechas(config: ConfiguracionReporteConsultas): { inicio: string; fin: string; descripcion: string } {
    const anio = config.anio || new Date().getFullYear();
    if (config.tipoLapso === 'MES') {
      const mesNum = config.mes || (new Date().getMonth() + 1);
      const mesStr = String(mesNum).padStart(2, '0');
      const ultimoDia = new Date(anio, mesNum, 0).getDate();
      const mesNombre = this.MESES.find((m) => m.valor === mesNum)?.nombre || mesStr;
      return {
        inicio: `${anio}-${mesStr}-01`,
        fin: `${anio}-${mesStr}-${String(ultimoDia).padStart(2, '0')}`,
        descripcion: `Mes de ${mesNombre} de ${anio}`
      };
    } else {
      const cuatrimestre = config.periodoCuatrimestre || 1;
      const periodos = this.obtenerPeriodosCuatrimestre(anio);
      const sel = periodos.find((p) => p.valor === cuatrimestre) || periodos[0];
      return {
        inicio: sel.fechaInicio,
        fin: sel.fechaFin,
        descripcion: `${sel.nombre} (${sel.mesesTexto})`
      };
    }
  }

  filtrarConsultas(consultas: ConsultaUnificada[], config: ConfiguracionReporteConsultas): ConsultaUnificada[] {
    const rango = this.obtenerRangoFechas(config);
    return consultas.filter((c) => {
      const fecha = c.fechaConsulta || c.fecha?.split(' ')[0] || '';
      if (!fecha) return false;

      const enRango = fecha >= rango.inicio && fecha <= rango.fin;
      if (!enRango) return false;

      if (config.soloCompletadas) {
        return c.estado === 'Completada' || c.estado === 'Resuelta' || c.asistencia === 1;
      }
      return true;
    });
  }

  prepararDatosDocentes(
    consultas: ConsultaUnificada[],
    docentes: UsuarioSistema[],
    opciones: {
      todosDocentes: boolean;
      docentesIds?: number[];
      docenteUnicoId?: number;
    }
  ): DocenteReporteData[] {
    const resultado: DocenteReporteData[] = [];

    if (opciones.docenteUnicoId) {
      const doc = docentes.find((u) => u.id === opciones.docenteUnicoId);
      const nombreDoc = doc ? doc.nombre : 'Docente Tutor';
      const programaDoc = doc?.programa || 'Docencia Universitaria';
      const consultasDoc = consultas.filter(
        (c) => c.docenteId === opciones.docenteUnicoId || c.tutor.toLowerCase() === nombreDoc.toLowerCase()
      );
      resultado.push({
        docenteId: opciones.docenteUnicoId,
        docenteNombre: nombreDoc,
        programaNombre: programaDoc,
        consultas: consultasDoc
      });
      return resultado;
    }

    let docentesAExportar = docentes.filter((u) => u.rol === 'DOCENTE');
    if (!opciones.todosDocentes && opciones.docentesIds && opciones.docentesIds.length > 0) {
      const setIds = new Set(opciones.docentesIds);
      docentesAExportar = docentesAExportar.filter((d) => setIds.has(d.id));
    }

    for (const doc of docentesAExportar) {
      const consultasDoc = consultas.filter(
        (c) => c.docenteId === doc.id || c.tutor.toLowerCase() === doc.nombre.toLowerCase()
      );
      if (consultasDoc.length > 0 || !opciones.todosDocentes) {
        resultado.push({
          docenteId: doc.id,
          docenteNombre: doc.nombre,
          programaNombre: doc.programa || 'Docencia Universitaria',
          consultas: consultasDoc
        });
      }
    }

    if (resultado.length === 0 && consultas.length > 0) {
      const tutoresUnicos = Array.from(new Set(consultas.map((c) => c.tutor).filter(Boolean)));
      for (const tutor of tutoresUnicos) {
        resultado.push({
          docenteNombre: tutor,
          programaNombre: 'Docencia Universitaria',
          consultas: consultas.filter((c) => c.tutor === tutor)
        });
      }
    }

    return resultado;
  }

  resolverTipoDocumento(c: ConsultaUnificada): string {
    const usuarios = this.dataService.usuarios();
    const estudiante = usuarios.find((u) => u.id === c.estudianteId);
    const sigla = (estudiante?.tipoDocumentoSigla || estudiante?.tipoIdentificacion || '').toUpperCase();
    if (sigla === 'TI') return 'Tarjeta de Identidad';
    if (sigla === 'CC') return 'Cédula de Ciudadanía';
    if (sigla === 'CE') return 'Cédula de Extranjería';
    if (sigla === 'PA' || sigla === 'PASAPORTE') return 'Pasaporte';
    if (sigla === 'PEP') return 'Identificación Extranjera';
    if (c.documento && c.documento.length > 9) return 'Cédula de Ciudadanía';
    return 'Cédula de Ciudadanía';
  }

  /**
   * Diligencia el XML de la hoja con la información oficial del docente y sus consultas (filas 13 a 37).
   */
  private popularHojaXml(
    baseXml: string,
    docenteNombre: string,
    programaNombre: string,
    consultas: ConsultaUnificada[]
  ): string {
    let xml = baseXml;

    // Fila 8: Nombre del Docente y Programa
    xml = xml.replace(
      /<c r="F8"[^>]*\/>/,
      `<c r="F8" s="68" t="inlineStr"><is><t>${this.escapeXml(docenteNombre)}</t></is></c>`
    );
    xml = xml.replace(
      /<c r="AD8"[^>]*\/>/,
      `<c r="AD8" s="68" t="inlineStr"><is><t>${this.escapeXml(programaNombre)}</t></is></c>`
    );

    // Filas 13 a 37: 25 registros oficiales
    for (let i = 1; i <= 25; i++) {
      const rowNum = 12 + i;
      const c = consultas[i - 1];
      if (!c) continue;

      let dd = '';
      let mm = '';
      let aaaa = '';
      if (c.fechaConsulta) {
        const partes = c.fechaConsulta.split('-');
        if (partes.length === 3) {
          aaaa = partes[0];
          mm = partes[1];
          dd = partes[2];
        }
      }

      const tipoDoc = this.resolverTipoDocumento(c);
      const firmaTexto =
        c.asistencia === 1 || c.estado === 'Completada' || c.estado === 'Resuelta'
          ? 'Asistió'
          : (c.estado || 'Asistió');
      const horaCorta = (c.horaConsulta || '').substring(0, 5);

      const reemplazar = (col: string, estilo: string, valor: string) => {
        const ref = `${col}${rowNum}`;
        const regex = new RegExp(`<c r="${ref}"[^>]*\\/>`);
        xml = xml.replace(
          regex,
          `<c r="${ref}" s="${estilo}" t="inlineStr"><is><t>${this.escapeXml(valor)}</t></is></c>`
        );
      };

      reemplazar('B', '37', c.estudiante || '');
      reemplazar('I', '6', tipoDoc);
      reemplazar('J', '6', c.documento || '');
      reemplazar('K', '37', c.tema || '');
      reemplazar('R', '34', c.nombrePrograma || programaNombre || 'Ingeniería de Sistemas');
      reemplazar('S', '53', c.asignatura || '');
      reemplazar('Z', '53', c.ubicacion || '');
      reemplazar('AF', '6', dd);
      reemplazar('AG', '6', mm);
      reemplazar('AH', '53', aaaa);
      reemplazar('AJ', '53', horaCorta);
      reemplazar('AM', '42', firmaTexto);
    }

    return xml;
  }

  /**
   * Genera el archivo Excel nativo (.xlsx) idéntico al formato institucional FR-GPA-16-V8.
   * Si hay múltiples docentes, genera una hoja independiente para cada docente en el mismo libro.
   */
  generarXlsxOficial(docentesData: DocenteReporteData[]): Uint8Array {
    const baseSheetXml = TEMPLATE_FILES_FR_GPA_16.find((f) => f.name === 'xl/worksheets/sheet1.xml')?.content || '';
    const archivos: ZipFileEntry[] = [];

    if (docentesData.length <= 1) {
      const d = docentesData[0] || { docenteNombre: 'Docente', programaNombre: 'Programa', consultas: [] };
      const hojaDiligenciada = this.popularHojaXml(baseSheetXml, d.docenteNombre, d.programaNombre, d.consultas);

      for (const tf of TEMPLATE_FILES_FR_GPA_16) {
        if (tf.name === 'xl/worksheets/sheet1.xml') {
          archivos.push({ name: tf.name, data: stringAUint8(hojaDiligenciada) });
        } else if (tf.name === 'xl/workbook.xml') {
          let wbXml = tf.content;
          const safeName = d.docenteNombre.replace(/[:\\/?*\[\]]/g, '').trim().substring(0, 31) || 'CONSULTA ESTUDIANTES';
          wbXml = wbXml.replace(/name="CONSULTA ESTUDIANTES"/, `name="${this.escapeXml(safeName)}"`);
          archivos.push({ name: tf.name, data: stringAUint8(wbXml) });
        } else if (tf.isBinary) {
          archivos.push({ name: tf.name, data: base64AUint8(tf.content) });
        } else {
          archivos.push({ name: tf.name, data: stringAUint8(tf.content) });
        }
      }
    } else {
      // Multi-docente: generar una hoja por docente
      const archivosHojas: ZipFileEntry[] = [];
      const sheetDefs: string[] = [];
      const sheetRels: string[] = [];
      const overrides: string[] = [];

      const sheet1Rels = TEMPLATE_FILES_FR_GPA_16.find((f) => f.name === 'xl/worksheets/_rels/sheet1.xml.rels')?.content || '';

      docentesData.forEach((d, idx) => {
        const numHoja = idx + 1;
        const nombreRutaHoja = `xl/worksheets/sheet${numHoja}.xml`;
        const nombreRelsHoja = `xl/worksheets/_rels/sheet${numHoja}.xml.rels`;
        const pestanaNombre = `${idx + 1}. ${d.docenteNombre.replace(/[:\\/?*\[\]]/g, '').trim()}`.substring(0, 31);

        const xmlHoja = this.popularHojaXml(baseSheetXml, d.docenteNombre, d.programaNombre, d.consultas);
        archivosHojas.push({ name: nombreRutaHoja, data: stringAUint8(xmlHoja) });
        archivosHojas.push({ name: nombreRelsHoja, data: stringAUint8(sheet1Rels) });

        sheetDefs.push(`<sheet name="${this.escapeXml(pestanaNombre)}" sheetId="${numHoja}" r:id="rId${numHoja}"/>`);
        sheetRels.push(`<Relationship Id="rId${numHoja}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${numHoja}.xml"/>`);
        overrides.push(`<Override PartName="/${nombreRutaHoja}" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`);
      });

      // Modificar [Content_Types].xml
      let ctXml = TEMPLATE_FILES_FR_GPA_16.find((f) => f.name === '[Content_Types].xml')?.content || '';
      ctXml = ctXml.replace(
        /<Override PartName="\/xl\/worksheets\/sheet1\.xml"[^>]*\/>/,
        overrides.join('')
      );

      // Relaciones del libro xl/_rels/workbook.xml.rels
      const wbRelsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">\n${sheetRels.join('\n')}\n<Relationship Id="rIdTheme" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/theme" Target="theme/theme1.xml"/>\n<Relationship Id="rIdStyles" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>\n<Relationship Id="rIdSharedStrings" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/sharedStrings" Target="sharedStrings.xml"/>\n<Relationship Id="rIdCalcChain" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/calcChain" Target="calcChain.xml"/>\n</Relationships>`;

      // Definición del libro xl/workbook.xml
      const wbXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><bookViews><workbookView xWindow="0" yWindow="0" windowWidth="28800" windowHeight="12300"/></bookViews><sheets>\n${sheetDefs.join('\n')}\n</sheets><calcPr calcId="191029"/></workbook>`;

      for (const tf of TEMPLATE_FILES_FR_GPA_16) {
        if (tf.name === '[Content_Types].xml') {
          archivos.push({ name: tf.name, data: stringAUint8(ctXml) });
        } else if (tf.name === 'xl/workbook.xml') {
          archivos.push({ name: tf.name, data: stringAUint8(wbXml) });
        } else if (tf.name === 'xl/_rels/workbook.xml.rels') {
          archivos.push({ name: tf.name, data: stringAUint8(wbRelsXml) });
        } else if (tf.name === 'xl/worksheets/sheet1.xml' || tf.name === 'xl/worksheets/_rels/sheet1.xml.rels') {
          // Reemplazados por archivosHojas
        } else if (tf.isBinary) {
          archivos.push({ name: tf.name, data: base64AUint8(tf.content) });
        } else {
          archivos.push({ name: tf.name, data: stringAUint8(tf.content) });
        }
      }

      archivos.push(...archivosHojas);
    }

    return empaquetarZip(archivos);
  }

  /**
   * Genera el libro Excel XML Spreadsheet 2003 (.xls) estructurado.
   */
  generarXmlExcel(docentesData: DocenteReporteData[], lapsoDescripcion?: string): string {
    const styles = `
 <Styles>
  <Style ss:ID="Default" ss:Name="Normal">
   <Alignment ss:Vertical="Center"/>
   <Font ss:FontName="Calibri" ss:Size="11" ss:Color="#000000"/>
  </Style>
  <Style ss:ID="sTitulo">
   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
   <Font ss:FontName="Calibri" ss:Size="15" ss:Bold="1" ss:Color="#1E3A8A"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="2" ss:Color="#1E3A8A"/>
   </Borders>
  </Style>
  <Style ss:ID="sCodigoDoc">
   <Alignment ss:Horizontal="Right" ss:Vertical="Center" ss:WrapText="1"/>
   <Font ss:FontName="Calibri" ss:Size="8" ss:Bold="1" ss:Color="#334155"/>
   <Borders>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#CBD5E1"/>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#CBD5E1"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#CBD5E1"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#CBD5E1"/>
   </Borders>
   <Interior ss:Color="#F8FAFC" ss:Pattern="Solid"/>
  </Style>
  <Style ss:ID="sDocenteLabel">
   <Alignment ss:Horizontal="Left" ss:Vertical="Center"/>
   <Font ss:FontName="Calibri" ss:Size="10" ss:Bold="1" ss:Color="#0F172A"/>
  </Style>
  <Style ss:ID="sDocenteVal">
   <Alignment ss:Horizontal="Left" ss:Vertical="Center"/>
   <Font ss:FontName="Calibri" ss:Size="10" ss:Bold="1" ss:Color="#1E3A8A"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#94A3B8"/>
   </Borders>
  </Style>
  <Style ss:ID="sNotaAclaratoria">
   <Alignment ss:Horizontal="Left" ss:Vertical="Center"/>
   <Font ss:FontName="Calibri" ss:Size="8" ss:Italic="1" ss:Color="#64748B"/>
  </Style>
  <Style ss:ID="sHeader">
   <Alignment ss:Horizontal="Center" ss:Vertical="Center" ss:WrapText="1"/>
   <Font ss:FontName="Calibri" ss:Size="9" ss:Bold="1" ss:Color="#0F172A"/>
   <Interior ss:Color="#E2E8F0" ss:Pattern="Solid"/>
   <Borders>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#94A3B8"/>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#94A3B8"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#94A3B8"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#94A3B8"/>
   </Borders>
  </Style>
  <Style ss:ID="sHeaderSub">
   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
   <Font ss:FontName="Calibri" ss:Size="8" ss:Bold="1" ss:Color="#334155"/>
   <Interior ss:Color="#F1F5F9" ss:Pattern="Solid"/>
   <Borders>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#94A3B8"/>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#94A3B8"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#94A3B8"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#94A3B8"/>
   </Borders>
  </Style>
  <Style ss:ID="sDataLeft">
   <Alignment ss:Horizontal="Left" ss:Vertical="Center"/>
   <Font ss:FontName="Calibri" ss:Size="9"/>
   <Borders>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#CBD5E1"/>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#CBD5E1"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#CBD5E1"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#CBD5E1"/>
   </Borders>
  </Style>
  <Style ss:ID="sDataCenter">
   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
   <Font ss:FontName="Calibri" ss:Size="9"/>
   <Borders>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#CBD5E1"/>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#CBD5E1"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#CBD5E1"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#CBD5E1"/>
   </Borders>
  </Style>
  <Style ss:ID="sFirmaLabel">
   <Font ss:FontName="Calibri" ss:Size="9" ss:Bold="1" ss:Color="#0F172A"/>
  </Style>
  <Style ss:ID="sFirmaLinea">
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#0F172A"/>
   </Borders>
  </Style>
 </Styles>`;

    const hojas = docentesData.map((d, indexDoc) => {
      const totalFilas = Math.max(d.consultas.length, 25);
      const filasDatos: string[] = [];

      for (let i = 1; i <= totalFilas; i++) {
        const c = d.consultas[i - 1];
        let dd = '';
        let mm = '';
        let aaaa = '';
        if (c && c.fechaConsulta) {
          const partes = c.fechaConsulta.split('-');
          if (partes.length === 3) {
            aaaa = partes[0];
            mm = partes[1];
            dd = partes[2];
          }
        }

        const tipoDoc = c ? this.resolverTipoDocumento(c) : '';
        const asistioTexto =
          c && (c.asistencia === 1 || c.estado === 'Completada' || c.estado === 'Resuelta')
            ? 'Asistió'
            : c
              ? c.estado
              : '';

        filasDatos.push(`
   <Row ss:Height="20">
    <Cell ss:StyleID="sDataCenter"><Data ss:Type="Number">${i}</Data></Cell>
    <Cell ss:StyleID="sDataLeft"><Data ss:Type="String">${this.escapeXml(c ? c.estudiante : '')}</Data></Cell>
    <Cell ss:StyleID="sDataCenter"><Data ss:Type="String">${this.escapeXml(tipoDoc)}</Data></Cell>
    <Cell ss:StyleID="sDataCenter"><Data ss:Type="String">${this.escapeXml(c ? c.documento : '')}</Data></Cell>
    <Cell ss:StyleID="sDataLeft"><Data ss:Type="String">${this.escapeXml(c ? c.tema : '')}</Data></Cell>
    <Cell ss:StyleID="sDataLeft"><Data ss:Type="String">${this.escapeXml(c ? c.nombrePrograma || 'Ingeniería de Sistemas' : '')}</Data></Cell>
    <Cell ss:StyleID="sDataLeft"><Data ss:Type="String">${this.escapeXml(c ? c.asignatura : '')}</Data></Cell>
    <Cell ss:StyleID="sDataCenter"><Data ss:Type="String">${this.escapeXml(c ? c.ubicacion : '')}</Data></Cell>
    <Cell ss:StyleID="sDataCenter"><Data ss:Type="String">${this.escapeXml(dd)}</Data></Cell>
    <Cell ss:StyleID="sDataCenter"><Data ss:Type="String">${this.escapeXml(mm)}</Data></Cell>
    <Cell ss:StyleID="sDataCenter"><Data ss:Type="String">${this.escapeXml(aaaa)}</Data></Cell>
    <Cell ss:StyleID="sDataCenter"><Data ss:Type="String">${this.escapeXml(c ? (c.horaConsulta || '').substring(0, 5) : '')}</Data></Cell>
    <Cell ss:StyleID="sDataCenter"><Data ss:Type="String">${this.escapeXml(asistioTexto)}</Data></Cell>
   </Row>`);
      }

      let nombrePestana = (d.docenteNombre || `Docente_${indexDoc + 1}`)
        .substring(0, 28)
        .replace(/[:\\/\?\*\[\]]/g, ' ')
        .trim();
      if (!nombrePestana) nombrePestana = `Docente_${indexDoc + 1}`;

      return `
 <Worksheet ss:Name="${this.escapeXml(nombrePestana)}">
  <Table ss:DefaultRowHeight="18">
   <Column ss:Width="30"/>
   <Column ss:Width="200"/>
   <Column ss:Width="130"/>
   <Column ss:Width="120"/>
   <Column ss:Width="180"/>
   <Column ss:Width="180"/>
   <Column ss:Width="160"/>
   <Column ss:Width="160"/>
   <Column ss:Width="35"/>
   <Column ss:Width="35"/>
   <Column ss:Width="45"/>
   <Column ss:Width="60"/>
   <Column ss:Width="110"/>

   <Row ss:Height="40">
    <Cell ss:Index="2" ss:MergeAcross="5" ss:StyleID="sTitulo">
     <Data ss:Type="String">CONSULTA ESTUDIANTES</Data>
    </Cell>
    <Cell ss:Index="11" ss:MergeAcross="2" ss:StyleID="sCodigoDoc">
     <Data ss:Type="String">FR-GPA-16-V8&#10;Vigencia: 15/12/2022&#10;Pág. 1 de 1</Data>
    </Cell>
   </Row>

   <Row ss:Height="12"></Row>
   <Row ss:Height="14">
    <Cell ss:Index="2" ss:MergeAcross="10" ss:StyleID="sNotaAclaratoria">
     <Data ss:Type="String">${this.escapeXml(lapsoDescripcion ? `Lapso reportado: ${lapsoDescripcion}` : '')}</Data>
    </Cell>
   </Row>

   <Row ss:Height="22">
    <Cell ss:StyleID="sDocenteLabel"><Data ss:Type="String">NOMBRE DEL DOCENTE:</Data></Cell>
    <Cell ss:MergeAcross="4" ss:StyleID="sDocenteVal"><Data ss:Type="String">${this.escapeXml(d.docenteNombre)}</Data></Cell>
    <Cell ss:StyleID="sDocenteLabel"><Data ss:Type="String">PROGRAMA:</Data></Cell>
    <Cell ss:MergeAcross="5" ss:StyleID="sDocenteVal"><Data ss:Type="String">${this.escapeXml(d.programaNombre)}</Data></Cell>
   </Row>

   <Row ss:Height="10"></Row>

   <Row ss:Height="16">
    <Cell ss:MergeAcross="12" ss:StyleID="sNotaAclaratoria">
     <Data ss:Type="String">En tipo de documento se debe especificar si es: Cédula de Ciudadanía, Tarjeta de Identidad, Contraseña, Pasaporte o Identificación Extranjera</Data>
    </Cell>
   </Row>

   <Row ss:Height="24">
    <Cell ss:MergeDown="1" ss:StyleID="sHeader"><Data ss:Type="String">No.</Data></Cell>
    <Cell ss:MergeDown="1" ss:StyleID="sHeader"><Data ss:Type="String">Nombre completo del Estudiante</Data></Cell>
    <Cell ss:MergeDown="1" ss:StyleID="sHeader"><Data ss:Type="String">Tipo de Documento</Data></Cell>
    <Cell ss:MergeDown="1" ss:StyleID="sHeader"><Data ss:Type="String">Número de Identificación</Data></Cell>
    <Cell ss:MergeDown="1" ss:StyleID="sHeader"><Data ss:Type="String">Tema Desarrollado</Data></Cell>
    <Cell ss:MergeDown="1" ss:StyleID="sHeader"><Data ss:Type="String">Programa al que pertenece el estudiante</Data></Cell>
    <Cell ss:MergeDown="1" ss:StyleID="sHeader"><Data ss:Type="String">Módulo</Data></Cell>
    <Cell ss:MergeDown="1" ss:StyleID="sHeader"><Data ss:Type="String">Lugar de Consulta</Data></Cell>
    <Cell ss:MergeAcross="2" ss:StyleID="sHeader"><Data ss:Type="String">Fecha</Data></Cell>
    <Cell ss:MergeDown="1" ss:StyleID="sHeader"><Data ss:Type="String">Hora</Data></Cell>
    <Cell ss:MergeDown="1" ss:StyleID="sHeader"><Data ss:Type="String">Firma del Estudiante</Data></Cell>
   </Row>
   <Row ss:Height="18">
    <Cell ss:Index="9" ss:StyleID="sHeaderSub"><Data ss:Type="String">dd</Data></Cell>
    <Cell ss:StyleID="sHeaderSub"><Data ss:Type="String">mm</Data></Cell>
    <Cell ss:StyleID="sHeaderSub"><Data ss:Type="String">aaaa</Data></Cell>
   </Row>

   ${filasDatos.join('')}

   <Row ss:Height="18"></Row>
   <Row ss:Height="28">
    <Cell ss:StyleID="sFirmaLabel"><Data ss:Type="String">FIRMA DOCENTE:</Data></Cell>
    <Cell ss:MergeAcross="4" ss:StyleID="sFirmaLinea"><Data ss:Type="String"></Data></Cell>
    <Cell ss:StyleID="sFirmaLabel"><Data ss:Type="String">Observaciones:</Data></Cell>
    <Cell ss:MergeAcross="5" ss:StyleID="sFirmaLinea"><Data ss:Type="String"></Data></Cell>
   </Row>
   <Row ss:Height="14"></Row>
   <Row ss:Height="28">
    <Cell ss:MergeAcross="4" ss:StyleID="sFirmaLabel"><Data ss:Type="String">FIRMA DEL DECANO O LÍDER DEL PROGRAMA ACADÉMICO:</Data></Cell>
    <Cell ss:MergeAcross="7" ss:StyleID="sFirmaLinea"><Data ss:Type="String"></Data></Cell>
   </Row>
  </Table>
 </Worksheet>`;
    }).join('\n');

    return `<?xml version="1.0" encoding="UTF-8"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:html="http://www.w3.org/TR/REC-html40">
${styles}
${hojas}
</Workbook>`;
  }

  /**
   * Genera el contenido CSV exacto según la plantilla institucional delimitada por comas (43 columnas).
   */
  generarCsv(docentesData: DocenteReporteData[]): string {
    const bloquesCsv: string[] = [];

    for (const d of docentesData) {
      const lineas: string[] = [];
      lineas.push(
        ',,,,CONSULTA ESTUDIANTES,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,"FR-GPA-16-V8\nVigencia: 15/12/2022\nPág. 1 de 1 "'
      );
      lineas.push(',,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,');
      lineas.push(',,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,');
      lineas.push(',,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,');
      lineas.push(',,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,');
      lineas.push(',,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,');
      lineas.push(',,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,');
      lineas.push(`NOMBRE DEL DOCENTE:,,,,,"${this.escapeCsv(d.docenteNombre)}",,,,,,,,,,,,,,,,,,,,,,PROGRAMA:,"${this.escapeCsv(d.programaNombre)}",,,,,,,,,,`);
      lineas.push(',,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,');
      lineas.push(
        '"En tipo de documento se debe especifica si es; Cedula de Ciudadanía, Tarjeta de Identidad, Contraseña, Pasaporte o Identificación Extranjera",,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,'
      );
      lineas.push(
        'No.,Nombre completo del Estudiante,,,,,,,Tipo de Documento ,Numero de Identificación,Tema Desarrollado,,,,,,,Programa al que pertenece el estudiante ,Modulo,,,,,,,Lugar de Consulta,,,,,,Fecha,,,,Hora,,,Firma del Estudiante,,,,'
      );
      lineas.push(',,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,dd,mm,aaaa,,,,,');

      const totalFilas = Math.max(d.consultas.length, 25);
      for (let i = 1; i <= totalFilas; i++) {
        const c = d.consultas[i - 1];
        if (!c) {
          lineas.push(`${i},,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,`);
          continue;
        }

        let dd = '';
        let mm = '';
        let aaaa = '';
        if (c.fechaConsulta) {
          const partes = c.fechaConsulta.split('-');
          if (partes.length === 3) {
            aaaa = partes[0];
            mm = partes[1];
            dd = partes[2];
          }
        }

        const tipoDoc = this.resolverTipoDocumento(c);
        const firma =
          c.asistencia === 1 || c.estado === 'Completada' || c.estado === 'Resuelta'
            ? 'Asistió'
            : (c.estado || 'Asistió');
        const horaCorta = (c.horaConsulta || '').substring(0, 5);

        lineas.push(
          `${i},"${this.escapeCsv(c.estudiante)}",,,,,,,"${this.escapeCsv(tipoDoc)}","${this.escapeCsv(c.documento)}","${this.escapeCsv(c.tema)}",,,,,,,"${this.escapeCsv(c.nombrePrograma || d.programaNombre || 'Ingeniería de Sistemas')}","${this.escapeCsv(c.asignatura)}",,,,,,,"${this.escapeCsv(c.ubicacion)}",,,,,,${dd},${mm},${aaaa},,"${horaCorta}",,,"${this.escapeCsv(firma)}",,,,`
        );
      }

      lineas.push(',,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,');
      lineas.push('FIRMA DOCENTE:,,,,,,,,,,,,Observaciones:,,,,,,,,,,,,,,,,,,,,,,,,,,');
      lineas.push(',,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,');
      lineas.push('FIRMA DEL DECANO O LIDER DEL PROGRAMA ACADÉMICO:,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,');

      bloquesCsv.push(lineas.join('\r\n'));
    }

    return '\uFEFF' + bloquesCsv.join('\r\n\r\n' + '='.repeat(80) + '\r\n\r\n');
  }

  descargarArchivo(contenido: string, nombreArchivo: string, tipoMime: string): void {
    if (typeof window === 'undefined') return;
    const blob = new Blob([contenido], { type: tipoMime });
    this.descargarBlob(blob, nombreArchivo);
  }

  descargarBlob(blob: Blob, nombreArchivo: string): void {
    if (typeof window === 'undefined') return;
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = nombreArchivo;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  }

  /**
   * Punto de entrada principal para generar y descargar el reporte oficial.
   */
  descargarReporte(
    docentesData: DocenteReporteData[],
    config: ConfiguracionReporteConsultas,
    formato: 'xlsx' | 'xls' | 'csv' = 'xlsx'
  ): void {
    const rango = this.obtenerRangoFechas(config);
    const sufijoDocente =
      docentesData.length === 1
        ? `_${docentesData[0].docenteNombre.replace(/\s+/g, '_')}`
        : '_Consolidado_Docentes';

    const sufijoLapso =
      config.tipoLapso === 'MES'
        ? `_Mes_${config.anio}_${String(config.mes).padStart(2, '0')}`
        : `_Periodo_${config.anio}_${config.periodoCuatrimestre}`;

    const nombreBase = `Reporte_Consultas_IUB${sufijoDocente}${sufijoLapso}`;

    if (formato === 'xlsx' || formato === 'xls') {
      const bytes = this.generarXlsxOficial(docentesData);
      const blob = new Blob([bytes.buffer as ArrayBuffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });
      this.descargarBlob(blob, `${nombreBase}.xlsx`);
    } else {
      const csv = this.generarCsv(docentesData);
      this.descargarArchivo(csv, `${nombreBase}.csv`, 'text/csv;charset=utf-8;');
    }
  }

  private escapeXml(str?: string | null): string {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  private escapeCsv(str?: string | null): string {
    if (!str) return '';
    return String(str).replace(/"/g, '""');
  }
}
