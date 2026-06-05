/**
 * AI Settings UI - Modal for managing AI provider settings
 */

import { aiProvider, formatCost, formatTokens, hasDemoKeys } from '../index.js';

let settingsModal = null;

/**
 * Show AI Settings Modal
 */
export async function showAISettings() {
  const status = aiProvider.getStatus();
  const stats = await aiProvider.getUsageStats();

  settingsModal = document.createElement('div');
  settingsModal.id = 'ai-settings-modal';
  settingsModal.className = 'modal-overlay';
  settingsModal.innerHTML = `
    <div class="modal-content ai-settings-modal">
      <div class="modal-header">
        <h3>⚙️ Cài đặt AI</h3>
        <button class="btn-close" onclick="window.closeAISettings()">&times;</button>
      </div>

      <div class="ai-settings-body">
        <!-- Current Status -->
        <div class="settings-section status-section">
          <h4>📊 Trạng thái hiện tại</h4>
          <div class="status-grid">
            <div class="status-item">
              <span class="status-label">Chế độ</span>
              <span class="status-value">${getModeLabel(status.mode)}</span>
            </div>
            <div class="status-item">
              <span class="status-label">Provider</span>
              <span class="status-value">${status.availableProviders.join(', ') || 'Chưa có'}</span>
            </div>
            ${status.mode === 'demo' ? `
            <div class="status-item">
              <span class="status-label">Demo còn lại</span>
              <span class="status-value">${stats?.demo?.remaining || 0}/${stats?.demo?.limit || 5} lượt hôm nay</span>
            </div>
            ` : ''}
          </div>
        </div>

        <!-- Mode Selection -->
        <div class="settings-section">
          <h4>🎯 Chọn chế độ</h4>

          <div class="mode-cards">
            <!-- Demo Mode -->
            <label class="mode-card ${status.mode === 'demo' ? 'selected' : ''} ${!hasDemoKeys() ? 'disabled' : ''}">
              <input type="radio" name="ai-mode" value="demo"
                     ${status.mode === 'demo' ? 'checked' : ''}
                     ${!hasDemoKeys() ? 'disabled' : ''}
                     onchange="window.setAIMode('demo')" />
              <div class="mode-icon">🎁</div>
              <div class="mode-info">
                <span class="mode-title">Demo Mode</span>
                <span class="mode-desc">Dùng thử miễn phí, 5 lượt/ngày</span>
              </div>
              ${!hasDemoKeys() ? '<span class="mode-badge unavailable">Chưa sẵn sàng</span>' : ''}
            </label>

            <!-- BYOK Mode -->
            <label class="mode-card ${status.mode === 'byok' ? 'selected' : ''}">
              <input type="radio" name="ai-mode" value="byok"
                     ${status.mode === 'byok' ? 'checked' : ''}
                     onchange="window.setAIMode('byok')" />
              <div class="mode-icon">🔑</div>
              <div class="mode-info">
                <span class="mode-title">Dùng API Key của tôi</span>
                <span class="mode-desc">Không giới hạn, bạn tự quản lý chi phí</span>
              </div>
            </label>

            <!-- Premium Mode (Coming Soon) -->
            <label class="mode-card disabled">
              <input type="radio" name="ai-mode" value="premium" disabled />
              <div class="mode-icon">⭐</div>
              <div class="mode-info">
                <span class="mode-title">Premium</span>
                <span class="mode-desc">Không giới hạn, không cần key</span>
              </div>
              <span class="mode-badge coming-soon">Sắp ra mắt</span>
            </label>
          </div>
        </div>

        <!-- API Keys Section (BYOK) -->
        <div class="settings-section keys-section" id="keys-section" style="${status.mode === 'byok' ? '' : 'display: none;'}">
          <h4>🔐 API Keys</h4>

          <!-- Gemini Key -->
          <div class="key-input-group">
            <div class="key-header">
              <span class="key-provider">
                <img src="https://www.gstatic.com/lamda/images/gemini_sparkle_v002_d4735304ff6292a690345.svg" alt="Gemini" width="20" />
                Gemini
              </span>
              <span class="key-status ${status.hasGeminiKey ? 'connected' : ''}">
                ${status.hasGeminiKey ? '✅ Đã kết nối' : '⚠️ Chưa có key'}
              </span>
            </div>
            <div class="key-input-row">
              <input type="password" id="gemini-key-input"
                     placeholder="AIzaSy..."
                     class="key-input" />
              <button class="btn-test" onclick="window.testAIKey('gemini')">Test</button>
              <button class="btn-save" onclick="window.saveAIKey('gemini')">Lưu</button>
            </div>
            <a href="https://aistudio.google.com/app/apikey" target="_blank" class="key-help">
              💡 Lấy key tại Google AI Studio
            </a>
          </div>

          <!-- Claude Key -->
          <div class="key-input-group">
            <div class="key-header">
              <span class="key-provider">
                <img src="https://www.anthropic.com/images/icons/apple-touch-icon.png" alt="Claude" width="20" />
                Claude
              </span>
              <span class="key-status ${status.hasClaudeKey ? 'connected' : ''}">
                ${status.hasClaudeKey ? '✅ Đã kết nối' : '⚠️ Chưa có key'}
              </span>
            </div>
            <div class="key-input-row">
              <input type="password" id="claude-key-input"
                     placeholder="sk-ant-..."
                     class="key-input" />
              <button class="btn-test" onclick="window.testAIKey('claude')">Test</button>
              <button class="btn-save" onclick="window.saveAIKey('claude')">Lưu</button>
            </div>
            <a href="https://console.anthropic.com/settings/keys" target="_blank" class="key-help">
              💡 Lấy key tại Anthropic Console
            </a>
          </div>
        </div>

        <!-- Preferred Provider -->
        <div class="settings-section">
          <h4>🎯 Provider ưu tiên</h4>
          <select id="preferred-provider" onchange="window.setPreferredProvider(this.value)">
            <option value="auto" ${status.preferredProvider === 'auto' ? 'selected' : ''}>
              🤖 Tự động (khuyên dùng)
            </option>
            <option value="gemini" ${status.preferredProvider === 'gemini' ? 'selected' : ''}>
              Gemini
            </option>
            <option value="claude" ${status.preferredProvider === 'claude' ? 'selected' : ''}>
              Claude
            </option>
          </select>
          <p class="setting-hint">Chế độ "Tự động" sẽ chọn model phù hợp nhất cho từng tác vụ</p>
        </div>

        <!-- Usage Stats -->
        <div class="settings-section">
          <h4>📈 Thống kê sử dụng</h4>
          <div class="usage-stats">
            <div class="stat-card">
              <span class="stat-value">${stats?.total?.requests || 0}</span>
              <span class="stat-label">Tổng requests</span>
            </div>
            <div class="stat-card">
              <span class="stat-value">${formatTokens(stats?.total?.inputTokens || 0)}</span>
              <span class="stat-label">Input tokens</span>
            </div>
            <div class="stat-card">
              <span class="stat-value">${formatTokens(stats?.total?.outputTokens || 0)}</span>
              <span class="stat-label">Output tokens</span>
            </div>
            <div class="stat-card">
              <span class="stat-value">${formatCost(stats?.total?.estimatedCost || 0)}</span>
              <span class="stat-label">Ước tính chi phí</span>
            </div>
          </div>
          <p class="setting-hint">Tháng này: ${stats?.monthly?.requests || 0} requests, ${formatCost(stats?.monthly?.estimatedCost || 0)}</p>
        </div>
      </div>

      <div class="modal-footer">
        <button class="btn btn-secondary" onclick="window.closeAISettings()">Đóng</button>
      </div>
    </div>
  `;

  document.body.appendChild(settingsModal);
}

/**
 * Close AI Settings Modal
 */
export function closeAISettings() {
  if (settingsModal) {
    settingsModal.remove();
    settingsModal = null;
  }
}

/**
 * Get mode label
 */
function getModeLabel(mode) {
  const labels = {
    demo: '🎁 Demo',
    byok: '🔑 BYOK',
    premium: '⭐ Premium'
  };
  return labels[mode] || mode;
}

// Window handlers
window.showAISettings = showAISettings;
window.closeAISettings = closeAISettings;

window.setAIMode = async function(mode) {
  await aiProvider.setMode(mode);

  // Show/hide keys section
  const keysSection = document.getElementById('keys-section');
  if (keysSection) {
    keysSection.style.display = mode === 'byok' ? '' : 'none';
  }

  // Update mode cards
  document.querySelectorAll('.mode-card').forEach(card => {
    const input = card.querySelector('input');
    card.classList.toggle('selected', input?.value === mode);
  });
};

window.setPreferredProvider = async function(provider) {
  await aiProvider.setPreferredProvider(provider);
};

window.testAIKey = async function(provider) {
  const input = document.getElementById(`${provider}-key-input`);
  const key = input?.value?.trim();

  if (!key) {
    alert('Vui lòng nhập API key');
    return;
  }

  const btn = event.target;
  btn.disabled = true;
  btn.textContent = '...';

  try {
    const result = await aiProvider.testProvider(provider, key);
    if (result.valid) {
      alert(`✅ API key ${provider} hợp lệ!`);
    } else {
      alert(`❌ API key không hợp lệ: ${result.error}`);
    }
  } catch (error) {
    alert(`❌ Lỗi: ${error.message}`);
  } finally {
    btn.disabled = false;
    btn.textContent = 'Test';
  }
};

window.saveAIKey = async function(provider) {
  const input = document.getElementById(`${provider}-key-input`);
  const key = input?.value?.trim();

  if (!key) {
    alert('Vui lòng nhập API key');
    return;
  }

  const btn = event.target;
  btn.disabled = true;
  btn.textContent = '...';

  try {
    await aiProvider.saveKey(provider, key);
    alert(`✅ Đã lưu API key ${provider}!`);
    input.value = '';

    // Update status display
    const statusEl = document.querySelector(`.key-input-group:has(#${provider}-key-input) .key-status`);
    if (statusEl) {
      statusEl.className = 'key-status connected';
      statusEl.textContent = '✅ Đã kết nối';
    }
  } catch (error) {
    alert(`❌ Lỗi: ${error.message}`);
  } finally {
    btn.disabled = false;
    btn.textContent = 'Lưu';
  }
};

export default {
  showAISettings,
  closeAISettings
};
