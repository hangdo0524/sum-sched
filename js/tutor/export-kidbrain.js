/**
 * KidBrain Export Module
 * Export Firebase data to downloadable Markdown files
 * Browser-based - no Node.js required
 */

import { ref, get } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js';

/**
 * Export child profile to Markdown
 */
function exportProfile(child) {
  return `---
type: kidbrain-profile
name: ${child.name || 'Unknown'}
grade: ${child.grade || 'null'}
school: ${child.school || 'null'}
exported_at: ${new Date().toISOString()}
---

# ${child.name}'s Profile

## Thông tin cơ bản
- **Tên:** ${child.name || '(chưa cập nhật)'}
- **Lớp:** ${child.grade || '(chưa cập nhật)'}
- **Trường:** ${child.school || '(chưa cập nhật)'}
- **Avatar:** ${child.avatar || '🧒'}

## Sở thích & Thế mạnh
(Cập nhật trong Obsidian)

## Phong cách học tập
(AI sẽ gợi ý dựa trên quan sát)
`;
}

/**
 * Export KidBrain notes to Markdown
 */
function exportNotes(notes) {
  const files = [];

  for (const [noteId, note] of Object.entries(notes || {})) {
    const slug = (note.title || 'untitled')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 40);

    const filename = `${note.type || 'note'}-${slug}.md`;

    const content = `---
type: kidbrain-${note.type || 'note'}
title: "${note.title || 'Untitled'}"
created: ${note.createdAt || new Date().toISOString()}
next_review: ${note.nextReview || 'null'}
ease_factor: ${note.easeFactor || 2.5}
---

# ${note.title || 'Untitled'}

${note.content || ''}

## Tóm tắt
${note.summary || '(Chưa có)'}
`;

    files.push({ filename, content });
  }

  return files;
}

/**
 * Export tutor sessions to timeline
 */
function exportTimeline(sessions) {
  // Group by month
  const byMonth = {};

  for (const [id, session] of Object.entries(sessions || {})) {
    const date = new Date(session.startedAt || session.createdAt || Date.now());
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    if (!byMonth[monthKey]) byMonth[monthKey] = [];
    byMonth[monthKey].push({ ...session, date });
  }

  let content = `---
type: kidbrain-timeline
exported_at: ${new Date().toISOString()}
---

# Learning Timeline

`;

  const sortedMonths = Object.keys(byMonth).sort().reverse();
  for (const month of sortedMonths) {
    const [year, m] = month.split('-');
    content += `## ${year} - Tháng ${parseInt(m)}\n\n`;

    const items = byMonth[month].sort((a, b) => b.date - a.date);
    for (const s of items) {
      const dateStr = s.date.toISOString().split('T')[0];
      const topic = s.topic || s.subject || 'Học tập';
      const msgCount = s.messages ? Object.keys(s.messages).length : 0;
      content += `- **${dateStr}:** ${topic} (${msgCount} tin nhắn)\n`;
    }
    content += '\n';
  }

  return content;
}

/**
 * Export strategic planning to roadmap
 */
function exportRoadmap(planning) {
  return `---
type: kidbrain-roadmap
status: active
exported_at: ${new Date().toISOString()}
---

# Current Roadmap

## Phân tích AI
${planning?.analysis || '(Chưa có phân tích)'}

## Mục tiêu ngắn hạn
${planning?.shortTermGoals || '(Chưa có)'}

## Mục tiêu dài hạn
${planning?.longTermGoals || '(Chưa có)'}

## Lộ trình chi tiết
${planning?.detailedPlan || '(Chưa có)'}
`;
}

/**
 * Download file to user's computer
 */
function downloadFile(filename, content) {
  const blob = new Blob([content], { type: 'text/markdown' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Download ZIP of multiple files
 */
async function downloadZip(files, zipName) {
  // Use JSZip if available, otherwise download individually
  if (typeof JSZip !== 'undefined') {
    const zip = new JSZip();
    for (const file of files) {
      zip.file(file.filename, file.content);
    }
    const blob = await zip.generateAsync({ type: 'blob' });
    downloadFile(zipName, blob);
  } else {
    // Fallback: download each file
    for (const file of files) {
      downloadFile(file.filename, file.content);
      await new Promise(r => setTimeout(r, 300)); // Delay between downloads
    }
  }
}

/**
 * Main export function - call from UI
 */
export async function exportKidBrain(db, userId, childId, childName) {
  const files = [];

  try {
    // 1. Export profile
    const childSnap = await get(ref(db, `families/${userId}/children/${childId}`));
    if (childSnap.exists()) {
      files.push({
        filename: 'self/profile.md',
        content: exportProfile(childSnap.val())
      });
    }

    // 2. Export KidBrain notes
    const notesSnap = await get(ref(db, `kidbrain/${userId}/${childId}/notes`));
    if (notesSnap.exists()) {
      const noteFiles = exportNotes(notesSnap.val());
      for (const f of noteFiles) {
        files.push({
          filename: `01-Learning/Concepts/${f.filename}`,
          content: f.content
        });
      }
    }

    // 3. Export timeline
    const sessionsSnap = await get(ref(db, `tutor-sessions/${userId}/${childId}`));
    if (sessionsSnap.exists()) {
      files.push({
        filename: 'progress/timeline.md',
        content: exportTimeline(sessionsSnap.val())
      });
    }

    // 4. Export roadmap
    const planSnap = await get(ref(db, `strategic-planning/${userId}/${childId}`));
    if (planSnap.exists()) {
      files.push({
        filename: 'roadmap/current.md',
        content: exportRoadmap(planSnap.val())
      });
    }

    // Download
    if (files.length === 0) {
      alert('Không có dữ liệu để export');
      return { success: false, error: 'No data' };
    }

    const zipName = `kidbrain-${childName || childId}-${new Date().toISOString().split('T')[0]}.zip`;

    // If only a few files, download individually
    if (files.length <= 3) {
      for (const f of files) {
        downloadFile(f.filename.replace(/\//g, '-'), f.content);
      }
    } else {
      await downloadZip(files, zipName);
    }

    return { success: true, fileCount: files.length };

  } catch (error) {
    console.error('Export error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Quick export button handler
 */
export function setupExportButton(buttonId, db, getUserId, getChildId, getChildName) {
  const btn = document.getElementById(buttonId);
  if (!btn) return;

  btn.addEventListener('click', async () => {
    btn.disabled = true;
    btn.textContent = 'Đang export...';

    try {
      const result = await exportKidBrain(
        db,
        getUserId(),
        getChildId(),
        getChildName()
      );

      if (result.success) {
        btn.textContent = `✅ Đã export ${result.fileCount} files`;
      } else {
        btn.textContent = `❌ ${result.error}`;
      }
    } catch (e) {
      btn.textContent = '❌ Lỗi export';
    }

    setTimeout(() => {
      btn.disabled = false;
      btn.textContent = '📥 Export KidBrain';
    }, 3000);
  });
}

export default {
  exportKidBrain,
  exportProfile,
  exportNotes,
  exportTimeline,
  exportRoadmap,
  setupExportButton
};
