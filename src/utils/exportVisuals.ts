export async function exportElementAsPdf(elementId: string, fileName: string) {
  const element = document.getElementById(elementId);
  if (!element) return;

  try {
    const [{ default: html2canvas }, { default: jsPDF }] = await Promise.all([
      import('html2canvas'),
      import('jspdf')
    ]);
    const canvas = await html2canvas(element, { scale: 2, useCORS: true, backgroundColor: '#020617' });
    const imgData = canvas.toDataURL('image/png');

    const pdf = new jsPDF('landscape', 'pt', 'a4');
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

    pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
    pdf.save(`${fileName}.pdf`);
  } catch (err) {
    console.error('PDF export failed:', err);
    alert('Failed to generate PDF.');
  }
}

export async function downloadOneGlanceSnapshot(elementId: string, title: string) {
  const element = document.getElementById(elementId);
  if (!element) return;

  try {
    const { default: html2canvas } = await import('html2canvas');
    const canvas = await html2canvas(element, { scale: 2, useCORS: true, backgroundColor: '#020617' });
    const link = document.createElement('a');
    link.download = `${title.toLowerCase().replace(/\s+/g, '_')}_glance.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  } catch (err) {
    console.error('Snapshot failed:', err);
    alert('Could not capture glance snapshot.');
  }
}
