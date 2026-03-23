import jsPDF from 'jspdf';
import type { PerformanceWithAttendees } from './supabase';

interface MusicianWithInstrument {
  name: string;
  instruments: string[];
}

export async function generateFullPerformancePDF(performance: PerformanceWithAttendees): Promise<void> {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  let yPosition = 20;

  doc.setFontSize(18);
  doc.text('Detalles de la Actuación', pageWidth / 2, yPosition, { align: 'center' });
  yPosition += 15;

  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Nombre:', 20, yPosition);
  doc.setFont('helvetica', 'normal');
  doc.text(performance.name, 50, yPosition);
  yPosition += 10;

  doc.setFont('helvetica', 'bold');
  doc.text('Fecha:', 20, yPosition);
  doc.setFont('helvetica', 'normal');
  doc.text(new Date(performance.date).toLocaleDateString('es-ES'), 50, yPosition);
  yPosition += 10;

  if (performance.location) {
    doc.setFont('helvetica', 'bold');
    doc.text('Lugar:', 20, yPosition);
    doc.setFont('helvetica', 'normal');
    doc.text(performance.location, 50, yPosition);
    yPosition += 10;
  }

  if (performance.planned_musicians) {
    doc.setFont('helvetica', 'bold');
    doc.text('Músicos Planeados:', 20, yPosition);
    doc.setFont('helvetica', 'normal');
    doc.text(performance.planned_musicians.toString(), 70, yPosition);
    yPosition += 10;
  }

  doc.setFont('helvetica', 'bold');
  doc.text('Estado de Pago:', 20, yPosition);
  doc.setFont('helvetica', 'normal');
  doc.text(performance.is_paid ? 'Pagada' : 'No Pagada', 70, yPosition);
  yPosition += 10;

  if (performance.payment_amount) {
    doc.setFont('helvetica', 'bold');
    doc.text('Cantidad de Pago:', 20, yPosition);
    doc.setFont('helvetica', 'normal');
    doc.text(`${performance.payment_amount}€`, 70, yPosition);
    yPosition += 10;
  }

  if (performance.total_amount) {
    doc.setFont('helvetica', 'bold');
    doc.text('Cantidad Total:', 20, yPosition);
    doc.setFont('helvetica', 'normal');
    doc.text(`${performance.total_amount}€`, 70, yPosition);
    yPosition += 10;
  }

  doc.setFont('helvetica', 'bold');
  doc.text('Pago Cobrado:', 20, yPosition);
  doc.setFont('helvetica', 'normal');
  doc.text(performance.payment_collected ? 'Sí' : 'No', 70, yPosition);
  yPosition += 15;

  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Músicos Participantes:', 20, yPosition);
  yPosition += 10;

  doc.setFontSize(11);
  if (performance.attendees && performance.attendees.length > 0) {
    const musicians = await getMusiciansWithInstruments(performance);

    musicians.forEach((musician) => {
      if (yPosition > 270) {
        doc.addPage();
        yPosition = 20;
      }

      doc.setFont('helvetica', 'normal');
      const instrumentText = musician.instruments.length > 0
        ? ` - ${musician.instruments.join(', ')}`
        : '';
      doc.text(`• ${musician.name}${instrumentText}`, 25, yPosition);
      yPosition += 7;
    });
  } else {
    doc.setFont('helvetica', 'italic');
    doc.text('No hay músicos asignados', 25, yPosition);
  }

  const fileName = `actuacion_${performance.name.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`;
  doc.save(fileName);
}

export async function generateMusiciansOnlyPDF(performance: PerformanceWithAttendees): Promise<void> {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  let yPosition = 20;

  doc.setFontSize(18);
  doc.text('Lista de Músicos', pageWidth / 2, yPosition, { align: 'center' });
  yPosition += 10;

  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text(`Actuación: ${performance.name}`, pageWidth / 2, yPosition, { align: 'center' });
  yPosition += 8;

  doc.setFont('helvetica', 'normal');
  doc.text(`Fecha: ${new Date(performance.date).toLocaleDateString('es-ES')}`, pageWidth / 2, yPosition, { align: 'center' });
  yPosition += 15;

  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Músicos:', 20, yPosition);
  yPosition += 10;

  doc.setFontSize(11);
  if (performance.attendees && performance.attendees.length > 0) {
    const musicians = await getMusiciansWithInstruments(performance);

    musicians.forEach((musician) => {
      if (yPosition > 270) {
        doc.addPage();
        yPosition = 20;
      }

      doc.setFont('helvetica', 'bold');
      doc.text(`• ${musician.name}`, 25, yPosition);
      yPosition += 6;

      if (musician.instruments.length > 0) {
        doc.setFont('helvetica', 'italic');
        doc.setFontSize(10);
        doc.text(`   ${musician.instruments.join(', ')}`, 25, yPosition);
        doc.setFontSize(11);
        yPosition += 7;
      } else {
        yPosition += 4;
      }
    });
  } else {
    doc.setFont('helvetica', 'italic');
    doc.text('No hay músicos asignados', 25, yPosition);
  }

  const fileName = `musicos_${performance.name.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`;
  doc.save(fileName);
}

async function getMusiciansWithInstruments(performance: PerformanceWithAttendees): Promise<MusicianWithInstrument[]> {
  const { supabase } = await import('./supabase');
  const musicians: MusicianWithInstrument[] = [];

  const { data: attendance } = await supabase
    .from('attendance')
    .select(`
      musician_id,
      guest_name,
      guest_instrument,
      selected_instrument_id,
      musicians(id, name),
      instruments:selected_instrument_id(name)
    `)
    .eq('performance_id', performance.id);

  if (!attendance) return [];

  const musicianIds = attendance
    .filter((att: any) => att.musician_id)
    .map((att: any) => att.musician_id);

  let allInstrumentsByMusician: any = {};
  if (musicianIds.length > 0) {
    const { data: musicianInstruments } = await supabase
      .from('musician_instruments')
      .select(`
        musician_id,
        instruments(id, name)
      `)
      .in('musician_id', musicianIds);

    allInstrumentsByMusician = musicianInstruments?.reduce((acc: any, mi: any) => {
      if (!acc[mi.musician_id]) {
        acc[mi.musician_id] = [];
      }
      acc[mi.musician_id].push(mi.instruments.name);
      return acc;
    }, {}) || {};
  }

  for (const att of attendance) {
    if (att.musician_id && att.musicians) {
      const selectedInstrument = att.instruments?.name;

      if (selectedInstrument) {
        musicians.push({
          name: att.musicians.name,
          instruments: [selectedInstrument],
        });
      } else {
        const allInstruments = allInstrumentsByMusician[att.musician_id] || [];
        musicians.push({
          name: att.musicians.name,
          instruments: allInstruments,
        });
      }
    } else if (att.guest_name) {
      musicians.push({
        name: att.guest_name,
        instruments: att.guest_instrument ? [att.guest_instrument] : [],
      });
    }
  }

  return musicians;
}
