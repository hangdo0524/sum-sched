/**
 * Curriculum Export - Export to PDF and JSON
 */

// ============================================
// JSON EXPORT
// ============================================

/**
 * Export curriculum to JSON file
 */
export function exportToJSON(curriculum) {
  const data = {
    exportedAt: new Date().toISOString(),
    version: '1.0',
    curriculum: {
      ...curriculum,
      // Remove internal fields
      id: undefined
    }
  };

  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const filename = `curriculum_${curriculum.subject?.id || 'unknown'}_grade${curriculum.grade}_${Date.now()}.json`;

  downloadFile(url, filename);

  return { success: true, filename };
}

// ============================================
// PDF EXPORT
// ============================================

/**
 * Export curriculum to PDF
 * Uses browser print functionality for simple PDF generation
 */
export function exportToPDF(curriculum, options = {}) {
  const {
    includeDetails = true,
    includeSchedule = true,
    includeExercises = true
  } = options;

  // Generate HTML content
  const html = generatePDFHTML(curriculum, {
    includeDetails,
    includeSchedule,
    includeExercises
  });

  // Open in new window for printing
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    return { error: 'Popup blocked. Please allow popups to export PDF.' };
  }

  printWindow.document.write(html);
  printWindow.document.close();

  // Wait for content to load then print
  printWindow.onload = function() {
    printWindow.print();
  };

  return { success: true };
}

/**
 * Generate HTML for PDF export
 */
function generatePDFHTML(curriculum, options) {
  const { includeDetails, includeSchedule, includeExercises } = options;

  const subjectName = curriculum.subject?.name || 'Môn học';
  const grade = curriculum.grade;
  const semester = curriculum.semester;

  let unitsHTML = '';
  for (const unit of curriculum.units || []) {
    unitsHTML += `
      <div class="unit">
        <h2>${unit.title}</h2>
        <p class="unit-meta">Thời lượng: ${unit.duration} | Mục tiêu: ${unit.objectives?.join(', ') || 'N/A'}</p>

        <table class="lessons-table">
          <thead>
            <tr>
              <th>Bài</th>
              <th>Tiêu đề</th>
              <th>Thời lượng</th>
              ${includeSchedule ? '<th>Ngày học</th>' : ''}
              <th>Loại</th>
            </tr>
          </thead>
          <tbody>
            ${(unit.lessons || []).map(lesson => `
              <tr>
                <td>${lesson.id}</td>
                <td>${lesson.title}</td>
                <td>${lesson.duration} phút</td>
                ${includeSchedule ? `<td>${lesson.scheduledDate || 'Chưa xếp'}</td>` : ''}
                <td>${getLessonTypeLabel(lesson.type)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        ${includeDetails ? generateUnitDetails(unit) : ''}
      </div>
    `;
  }

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Giáo trình ${subjectName} - Lớp ${grade}</title>
  <style>
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    body {
      font-family: 'Times New Roman', serif;
      font-size: 12pt;
      line-height: 1.5;
      padding: 20mm;
      max-width: 210mm;
      margin: 0 auto;
    }

    h1 {
      text-align: center;
      font-size: 18pt;
      margin-bottom: 10mm;
      border-bottom: 2px solid #333;
      padding-bottom: 5mm;
    }

    .meta {
      display: flex;
      justify-content: space-between;
      margin-bottom: 10mm;
      font-size: 11pt;
      color: #555;
    }

    .objectives {
      background: #f5f5f5;
      padding: 5mm;
      margin-bottom: 10mm;
      border-left: 3px solid #333;
    }

    .objectives h3 {
      font-size: 12pt;
      margin-bottom: 3mm;
    }

    .objectives ul {
      margin-left: 5mm;
    }

    .unit {
      margin-bottom: 15mm;
      page-break-inside: avoid;
    }

    .unit h2 {
      font-size: 14pt;
      background: #eee;
      padding: 3mm 5mm;
      margin-bottom: 5mm;
    }

    .unit-meta {
      font-size: 10pt;
      color: #666;
      margin-bottom: 5mm;
    }

    .lessons-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 5mm;
      font-size: 10pt;
    }

    .lessons-table th,
    .lessons-table td {
      border: 1px solid #ccc;
      padding: 2mm 3mm;
      text-align: left;
    }

    .lessons-table th {
      background: #f0f0f0;
      font-weight: bold;
    }

    .lesson-detail {
      margin: 5mm 0;
      padding: 3mm;
      background: #fafafa;
      border: 1px solid #ddd;
      font-size: 10pt;
    }

    .lesson-detail h4 {
      font-size: 11pt;
      margin-bottom: 2mm;
    }

    .exercises {
      margin-top: 3mm;
      padding-left: 5mm;
    }

    .footer {
      margin-top: 20mm;
      text-align: center;
      font-size: 9pt;
      color: #888;
      border-top: 1px solid #ddd;
      padding-top: 5mm;
    }

    @media print {
      body {
        padding: 0;
      }

      .unit {
        page-break-inside: avoid;
      }
    }
  </style>
</head>
<body>
  <h1>GIÁO TRÌNH ${subjectName.toUpperCase()}</h1>

  <div class="meta">
    <span><strong>Lớp:</strong> ${grade}</span>
    <span><strong>Học kỳ:</strong> ${semester}</span>
    <span><strong>Tổng số bài:</strong> ${curriculum.totalLessons || 'N/A'}</span>
    <span><strong>Số tuần:</strong> ${curriculum.totalWeeks || 'N/A'}</span>
  </div>

  <div class="objectives">
    <h3>MỤC TIÊU GIÁO TRÌNH</h3>
    <ul>
      ${(curriculum.objectives || []).map(obj => `<li>${obj}</li>`).join('')}
    </ul>
  </div>

  ${unitsHTML}

  <div class="footer">
    <p>Giáo trình được tạo bởi AI Curriculum Engine</p>
    <p>Xuất ngày: ${new Date().toLocaleDateString('vi-VN')}</p>
  </div>
</body>
</html>
  `;
}

function generateUnitDetails(unit) {
  let html = '';

  for (const lesson of unit.lessons || []) {
    html += `
      <div class="lesson-detail">
        <h4>${lesson.title}</h4>
        <p><strong>Mục tiêu:</strong> ${lesson.objectives?.join(', ') || 'N/A'}</p>
        <p><strong>Nội dung:</strong> ${lesson.content || 'N/A'}</p>

        ${lesson.exercises?.length ? `
          <div class="exercises">
            <strong>Bài tập:</strong>
            <ul>
              ${lesson.exercises.map(ex => `<li>${ex.description} (${ex.difficulty})</li>`).join('')}
            </ul>
          </div>
        ` : ''}
      </div>
    `;
  }

  return html;
}

function getLessonTypeLabel(type) {
  const labels = {
    concept: 'Lý thuyết',
    practice: 'Thực hành',
    review: 'Ôn tập',
    assessment: 'Kiểm tra'
  };
  return labels[type] || type;
}

// ============================================
// UTILITIES
// ============================================

function downloadFile(url, filename) {
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ============================================
// EXPORTS
// ============================================

export default {
  exportToJSON,
  exportToPDF
};
