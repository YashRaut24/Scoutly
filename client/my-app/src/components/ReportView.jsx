// client/src/components/ReportView.jsx
import React from 'react';
import ReactMarkdown from 'react-markdown';
import html2pdf from 'html2pdf.js';
import './ReportView.css';

export default function ReportView({ query, content }) {
  // Helper to turn queries like "Rust vs Go" into clean file names like "rust_vs_go_report"
  const getSafeFileName = (ext) => {
    const sanitized = query.toLowerCase().replace(/[^a-z0-9]/g, '_').replace(/_+/g, '_');
    return `${sanitized || 'research'}_report.${ext}`;
  };

  // 1. Export as Raw Markdown (.md)
  const handleExportMarkdown = () => {
    const blob = new Blob([content], { type: 'text/markdown;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', getSafeFileName('md'));
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // 2. Export as PDF (.pdf)
  const handleExportPDF = () => {
    const element = document.getElementById('printable-report');
    const opt = {
      margin: [15, 15, 15, 15],
      filename: getSafeFileName('pdf'),
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, backgroundColor: '#121824' },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };

    html2pdf().set(opt).from(element).save();
  };

  return (
    <div className="report-card">
      <div className="report-header">
        <h2 className="report-title">Report: {query}</h2>
        <div className="export-actions">
          <button className="export-btn" onClick={handleExportMarkdown} title="Download .md file">
            📥 Markdown
          </button>
          <button className="export-btn primary" onClick={handleExportPDF} title="Download PDF document">
            📄 Export PDF
          </button>
        </div>
      </div>

      {/* Target element captured for PDF generation */}
      <div id="printable-report" className="report-body">
        <ReactMarkdown
          components={{
            a: ({ node, ...props }) => (
              <a {...props} target="_blank" rel="noopener noreferrer" className="report-link" />
            )
          }}
        >
          {content}
        </ReactMarkdown>
      </div>
    </div>
  );
}