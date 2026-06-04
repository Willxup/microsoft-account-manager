<template>
  <div v-if="authLoading" class="auth-shell">
    <n-spin size="large" />
  </div>

  <div v-else-if="!isAuthenticated" class="auth-shell auth-shell-login">
    <section class="login-panel" aria-label="后台登录">
      <div class="login-hero">
        <div class="login-brand">
          <div class="brand-icon login-brand-icon">
            <img class="brand-icon-image" src="/brand-icon.svg" alt="" aria-hidden="true" />
          </div>
          <div>
            <h1>Microsoft 账号工作台</h1>
            <p>Graph / IMAP 取件 · 账号管理</p>
          </div>
        </div>
        <div class="login-visual">
          <span class="login-visual-pill">Graph</span>
          <span class="login-visual-pill">IMAP OAuth2</span>
          <span class="login-visual-pill">Cloudflare</span>
        </div>
      </div>

      <div class="login-form-panel">
        <div class="login-form-heading">
          <span class="login-form-kicker">安全入口</span>
          <h2>登录后台</h2>
          <p>进入新版工作台管理账号与取件结果。</p>
        </div>

        <n-form label-placement="top" class="login-form">
          <n-form-item label="用户名">
            <n-input
              v-model:value="loginForm.username"
              class="workbench-input login-input"
              placeholder="请输入用户名"
              @keyup.enter="handleLogin"
            />
          </n-form-item>
          <n-form-item label="密码">
            <n-input
              v-model:value="loginForm.password"
              class="workbench-input login-input"
              type="password"
              show-password-on="click"
              placeholder="请输入密码"
              @keyup.enter="handleLogin"
            />
          </n-form-item>
        </n-form>

        <button class="login-submit-button" type="button" :disabled="loginLoading" @click="handleLogin">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
            <path d="m10 17 5-5-5-5" />
            <path d="M15 12H3" />
          </svg>
          <span>{{ loginLoading ? '登录中' : '进入工作台' }}</span>
        </button>
      </div>
    </section>
  </div>

  <div v-else class="page app-page">
    <section class="app-topbar">
      <div class="brand-block">
        <div class="brand-icon">
          <img class="brand-icon-image" src="/brand-icon.svg" alt="" aria-hidden="true" />
        </div>
        <div>
          <h1>Microsoft 账号工作台</h1>
          <p>Graph / IMAP 取件 · 账号管理</p>
        </div>
      </div>
      <div class="topbar-actions">
        <div class="mode-switch" role="tablist" aria-label="界面模式">
          <button
            class="mode-switch-button"
            :class="{ 'mode-switch-button-active': viewMode === 'workbench' }"
            type="button"
            @click="viewMode = 'workbench'"
          >
            工作台
          </button>
          <button
            class="mode-switch-button"
            :class="{ 'mode-switch-button-active': viewMode === 'classic' }"
            type="button"
            @click="viewMode = 'classic'"
          >
            经典后台
          </button>
        </div>
        <span class="session-pill">
          <span class="session-dot"></span>
          已登录：{{ currentUser }}
        </span>
        <n-button class="topbar-logout" quaternary :loading="logoutLoading" @click="handleLogout">退出登录</n-button>
      </div>
    </section>

    <input
      ref="txtFileInputRef"
      class="hidden-file-input"
      type="file"
      accept=".txt,text/plain"
      @change="handleTxtFileChange"
    />

    <section v-show="viewMode === 'workbench'" class="workbench-shell">
      <aside class="account-sidebar">
        <div class="sidebar-heading">
          <div class="sidebar-title">
            <span class="sidebar-title-icon">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M8 6h13" />
                <path d="M8 12h13" />
                <path d="M8 18h13" />
                <path d="M3 6h.01" />
                <path d="M3 12h.01" />
                <path d="M3 18h.01" />
              </svg>
            </span>
            <span>邮箱列表</span>
          </div>
          <span class="sidebar-count">{{ workbenchFilteredAccounts.length }}</span>
        </div>

        <n-input
          v-model:value="searchKeyword"
          clearable
          class="workbench-input sidebar-search"
          placeholder="搜索邮箱 / 备注"
        />

        <div class="sidebar-toolbar">
          <button class="workbench-action workbench-action-primary sidebar-primary-action" type="button" :disabled="importLoading" @click="openImportModal">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M12 5v14" />
              <path d="M5 12h14" />
            </svg>
            <span>批量导入</span>
          </button>
          <n-popover
            trigger="click"
            placement="bottom-end"
            :show="exportPopoverVisible"
            :width="112"
            @update:show="exportPopoverVisible = $event"
          >
            <template #trigger>
              <button class="workbench-icon-button" type="button" title="导出邮箱" @click.stop>
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M12 3v10m0 0 4-4m-4 4-4-4" />
                  <path d="M5 15v3a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-3" />
                </svg>
              </button>
            </template>
            <div class="workbench-popover-menu">
              <button class="workbench-menu-item" type="button" @click.stop="handleExportAccounts(false)">
                导出勾选
              </button>
              <button class="workbench-menu-item" type="button" @click.stop="handleExportAccounts(true)">
                导出全部
              </button>
            </div>
          </n-popover>
          <button class="workbench-icon-button" type="button" title="刷新列表" :disabled="tableLoading" @click="loadAccounts">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M20 6v5h-5" />
              <path d="M4 18v-5h5" />
              <path d="M18 10a6.5 6.5 0 0 0-11-3L4 10" />
              <path d="M6 14a6.5 6.5 0 0 0 11 3l3-3" />
            </svg>
          </button>
          <button class="workbench-icon-button" type="button" title="选择当前页" @click="handleWorkbenchToggleCurrentPage(!isWorkbenchPageAllChecked)">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M4 5a2 2 0 0 1 2-2h9" />
              <path d="M4 19a2 2 0 0 0 2 2h9" />
              <path d="M4 9v6" />
              <path d="m15 12 2 2 5-6" />
            </svg>
          </button>
        </div>

        <n-spin :show="tableLoading" class="account-list-region">
          <div v-if="workbenchAccounts.length === 0" class="sidebar-empty">
            <n-empty description="暂无邮箱" size="small" />
          </div>
          <div v-else class="account-list">
            <article
              v-for="row in workbenchAccounts"
              :key="row.id"
              class="account-list-item"
              :class="{
                'account-list-item-selected': isAccountChecked(row.id),
                'account-list-item-current': currentWorkbenchAccountId === row.id
              }"
              @click="handleWorkbenchRowCardClick(row.id)"
            >
              <n-checkbox
                :checked="isAccountChecked(row.id)"
                @click.stop
                @update:checked="handleWorkbenchRowChecked(row.id, $event)"
              />
              <div class="account-main">
                <span class="account-email">{{ row.account }}</span>
                <span class="account-meta">{{ resolveWorkbenchMeta(row) }}</span>
                <span class="account-remark">{{ resolveWorkbenchRemark(row) }}</span>
              </div>
              <div class="account-row-actions">
                <button class="icon-action" type="button" title="复制邮箱" @click.stop="handleCopyAccountField(row, 'account')">
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M8 8h9a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2v-9a2 2 0 0 1 2-2Z" />
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                  </svg>
                </button>
                <button class="icon-action" type="button" title="编辑账号" @click.stop="openEditModal(row)">
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M12 20h9" />
                    <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4Z" />
                  </svg>
                </button>
                <button class="icon-action icon-action-danger" type="button" title="删除账号" @click.stop="handleDeleteAccount(row.id)">
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M4 7h16" />
                    <path d="M10 11v6" />
                    <path d="M14 11v6" />
                    <path d="M6 7l1 14h10l1-14" />
                    <path d="M9 7V4h6v3" />
                  </svg>
                </button>
              </div>
            </article>
          </div>
        </n-spin>

        <div class="sidebar-pagination">
          <button class="workbench-page-button" type="button" :disabled="workbenchPagination.page <= 1" @click="handleWorkbenchPageChange(workbenchPagination.page - 1)">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="m15 18-6-6 6-6" />
            </svg>
          </button>
          <span class="sidebar-page-text">第 {{ workbenchPagination.page }} / {{ workbenchPagination.pageCount }} 页</span>
          <n-select
            :value="workbenchPageSize"
            size="small"
            class="workbench-select sidebar-page-size"
            :options="workbenchPageSizeOptions"
            @update:value="handleWorkbenchPageSizeChange"
          />
          <button class="workbench-page-button" type="button" :disabled="workbenchPagination.page >= workbenchPagination.pageCount" @click="handleWorkbenchPageChange(workbenchPagination.page + 1)">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="m9 18 6-6-6-6" />
            </svg>
          </button>
        </div>
      </aside>

      <main class="mail-workspace">
        <section class="mail-toolbar-panel">
          <div class="mail-filter-grid">
            <n-input v-model:value="workbenchMailKeyword" clearable class="workbench-input" placeholder="搜索关键词（主题/正文）" />
            <n-input v-model:value="workbenchMailSender" clearable class="workbench-input" placeholder="发件人过滤（可选）" />
            <n-select v-model:value="workbenchMailLimit" class="workbench-select" :options="mailLimitOptions" />
          </div>
          <div class="mail-action-row">
            <div class="protocol-switch" aria-label="取件协议">
              <button
                type="button"
                :class="{ 'protocol-button-active': mailFetchMode === 'imap' }"
                @click="mailFetchMode = 'imap'"
              >
                IMAP
              </button>
              <button
                type="button"
                :class="{ 'protocol-button-active': mailFetchMode === 'graph' }"
                @click="mailFetchMode = 'graph'"
              >
                Graph
              </button>
            </div>
            <div class="mail-action-buttons">
              <button
                class="workbench-fetch-button workbench-fetch-button-selected"
                type="button"
                :disabled="selectedWorkbenchRows.length === 0 || workbenchMailLoading"
                @click="handleWorkbenchFetchSelected"
              >
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M12 3v10m0 0 4-4m-4 4-4-4" />
                  <path d="M5 15v3a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-3" />
                </svg>
                <span>{{ workbenchMailLoading ? '取件中' : '选中取件' }}</span>
              </button>
              <button class="workbench-fetch-button workbench-fetch-button-all" type="button" :disabled="workbenchMailLoading" @click="handleWorkbenchFetchAll">
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M12 3v10m0 0 4-4m-4 4-4-4" />
                  <path d="M5 15v3a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-3" />
                </svg>
                <span>{{ workbenchMailLoading ? '取件中' : '全部取件' }}</span>
              </button>
            </div>
          </div>
        </section>

        <section class="mail-result-panel" :class="{ 'mail-result-panel-loading': workbenchMailLoading }">
          <div v-if="workbenchMailLoading" class="workbench-loading-layer">
            <span class="workbench-spinner"></span>
            <span>正在取件</span>
          </div>
          <div class="mail-result-content">
            <div v-if="workbenchMailResults.length === 0" class="workbench-empty-state">
              <div class="empty-mail-icon">
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M4 6h16v13H4Z" />
                  <path d="m4 7 8 6 8-6" />
                  <path d="M9 17h6" />
                </svg>
              </div>
              <p>在左侧选择邮箱，然后点击取件</p>
              <span>支持 IMAP OAuth2 + Graph API 双协议取件，结果会显示在这里。</span>
            </div>
            <div v-else class="workbench-result-list">
              <article
                v-for="result in displayedWorkbenchMailResults"
                :key="`${result.accountId}-${result.mode}`"
                class="workbench-result-card"
                :class="{ 'workbench-result-card-error': !result.ok }"
              >
                <div class="result-card-header">
                  <div>
                    <h3>{{ result.account }}</h3>
                    <p>{{ result.mode.toUpperCase() }} · {{ result.ok ? `${result.messages.length} 封` : result.error }}</p>
                  </div>
                </div>
                <div v-if="result.ok && result.messages.length > 0" class="result-message-list">
                  <button
                    v-for="item in result.messages"
                    :key="item.id"
                    class="result-message-item"
                    type="button"
                    @click="openWorkbenchMailDetail(result, item)"
                  >
                    <strong>{{ item.subject || '(无主题)' }}</strong>
                    <span>{{ item.from || '-' }}</span>
                    <small>{{ formatMailDate(item.receivedAt) }}</small>
                  </button>
                </div>
                <p v-else-if="result.ok" class="result-empty-text">没有匹配当前过滤条件的邮件。</p>
              </article>
            </div>
          </div>
        </section>
      </main>
    </section>

    <div v-show="viewMode === 'classic'" class="classic-shell">
    <n-tabs v-model:value="activeTab" type="segment" animated>
      <n-tab-pane name="accounts" tab="账号管理">
        <n-space vertical size="large">
          <n-card title="新增账号" size="small">
            <n-grid :x-gap="12" :y-gap="12" :cols="24">
              <n-gi :span="6">
                <n-form-item label="账号">
                  <n-input v-model:value="createForm.account" placeholder="请输入账号" />
                </n-form-item>
              </n-gi>
              <n-gi :span="6">
                <n-form-item label="密码">
                  <n-input
                    v-model:value="createForm.password"
                    type="password"
                    show-password-on="click"
                    placeholder="请输入密码"
                  />
                </n-form-item>
              </n-gi>
              <n-gi :span="6">
                <n-form-item label="Client ID（可选）">
                  <n-input v-model:value="createForm.clientId" placeholder="client_id" />
                </n-form-item>
              </n-gi>
              <n-gi :span="6">
                <n-form-item label="Refresh Token（可选）">
                  <n-input v-model:value="createForm.refreshToken" placeholder="refresh_token" />
                </n-form-item>
              </n-gi>
              <n-gi :span="24">
                <n-form-item label="备注（可选）">
                  <n-input v-model:value="createForm.remark" placeholder="备注信息" />
                </n-form-item>
              </n-gi>
            </n-grid>
            <n-space justify="end">
              <n-button type="primary" :loading="createLoading" @click="handleCreateAccount">
                保存账号
              </n-button>
            </n-space>
          </n-card>

          <n-card title="批量导入" size="small">
            <n-input
              v-model:value="importText"
              type="textarea"
              :autosize="{ minRows: 5, maxRows: 9 }"
              placeholder="每行一个账号：账号----密码 或 账号----密码----client_id----refresh_token"
            />
            <template #footer>
              <n-space justify="space-between" align="center" wrap>
                <span class="hint">支持手动输入或 TXT 文件导入，空行会自动忽略。</span>
                <n-space>
                  <n-button secondary :loading="importLoading" @click="triggerTxtImport">
                    导入 TXT
                  </n-button>
                  <n-button type="primary" secondary :loading="importLoading" @click="handleImport">
                    导入文本
                  </n-button>
                </n-space>
              </n-space>
            </template>
          </n-card>

          <n-card title="账号列表" size="small">
            <div class="list-toolbar">
              <div class="list-toolbar-left">
                <n-input
                  v-model:value="searchKeyword"
                  clearable
                  style="max-width: 340px"
                  placeholder="按账号或备注搜索"
                  @keyup.enter="loadAccounts"
                />
                <n-tag type="info" size="small">共 {{ accounts.length }} 条</n-tag>
                <n-tag type="warning" size="small">已选 {{ checkedRowKeys.length }} 条</n-tag>
              </div>
              <div class="list-toolbar-right">
                <n-select
                  v-model:value="mailFetchMode"
                  size="small"
                  :options="mailModeOptions"
                  style="width: 120px"
                />
                <n-button size="small" :loading="syncLoading" @click="handleRefreshAccounts(false)">
                  刷新选中
                </n-button>
                <n-button size="small" :loading="syncLoading" @click="handleRefreshAccounts(true)">
                  刷新全部
                </n-button>
                <n-button size="small" @click="handleSelectAll">全选</n-button>
                <n-button size="small" @click="handleSelectInverse">反选</n-button>
                <n-button 
                  size="small" 
                  type="error" 
                  :loading="batchDeleteLoading"
                  :disabled="checkedRowKeys.length === 0"
                  @click="handleBatchDelete"
                >
                  批量删除
                </n-button>
                <n-button size="small" :loading="tableLoading" @click="loadAccounts">刷新列表</n-button>
                <n-popover
                  trigger="click"
                  placement="bottom-end"
                  :show="exportPopoverVisible"
                  :width="104"
                  @update:show="exportPopoverVisible = $event"
                >
                  <template #trigger>
                    <n-button size="small" @click.stop>导出</n-button>
                  </template>
                  <div class="copy-popover">
                    <n-button size="tiny" quaternary class="copy-action-btn" @click.stop="handleExportAccounts(false)">
                      导出勾选
                    </n-button>
                    <n-button size="tiny" quaternary class="copy-action-btn" @click.stop="handleExportAccounts(true)">
                      导出全部
                    </n-button>
                  </div>
                </n-popover>
              </div>
            </div>

            <n-data-table
              class="account-table"
              :columns="accountColumns"
              :data="accounts"
              :row-key="rowKey"
              :loading="tableLoading"
              :checked-row-keys="checkedRowKeys"
              :pagination="tablePagination"
              :scroll-x="1120"
              max-height="520"
              @update:checked-row-keys="handleCheckedRowKeysUpdate"
            />
          </n-card>
        </n-space>
      </n-tab-pane>

      <n-tab-pane name="ingest" tab="上传接口">
        <n-space vertical size="large">
          <n-card title="外部上传接口说明" size="small">
            <div class="api-box">
              <p><strong>接口地址：</strong>{{ ingestEndpointUrl }}</p>
              <p><strong>请求方法：</strong>POST</p>
              <p><strong>Content-Type：</strong>application/json 或 text/plain</p>
              <p><strong>鉴权头：</strong>{{ ingestTokenHeader }}: &lt;INGEST_TOKEN&gt;</p>
            </div>
          </n-card>

          <n-card title="上传字段映射配置" size="small">
            <n-form label-placement="top">
              <n-grid :x-gap="12" :y-gap="12" :cols="24">
                <n-gi :span="8">
                  <n-form-item label="分隔符">
                    <n-input v-model:value="ingestConfig.delimiter" placeholder="----" />
                  </n-form-item>
                </n-gi>
                <n-gi :span="8">
                  <n-form-item label="captcha 行字段名">
                    <n-input v-model:value="ingestConfig.captchaField" placeholder="data" />
                  </n-form-item>
                </n-gi>
                <n-gi :span="8">
                  <n-form-item label="账号字段名">
                    <n-input v-model:value="ingestConfig.accountField" placeholder="a" />
                  </n-form-item>
                </n-gi>
                <n-gi :span="8">
                  <n-form-item label="密码字段名">
                    <n-input v-model:value="ingestConfig.passwordField" placeholder="p" />
                  </n-form-item>
                </n-gi>
                <n-gi :span="8">
                  <n-form-item label="client_id 字段名">
                    <n-input v-model:value="ingestConfig.clientIdField" placeholder="c" />
                  </n-form-item>
                </n-gi>
                <n-gi :span="8">
                  <n-form-item label="refresh_token 字段名">
                    <n-input v-model:value="ingestConfig.tokenField" placeholder="t" />
                  </n-form-item>
                </n-gi>
              </n-grid>
            </n-form>
            <n-space justify="end">
              <n-button type="primary" :loading="saveIngestLoading" @click="handleSaveIngestConfig">
                保存映射配置
              </n-button>
            </n-space>
          </n-card>

          <n-card title="请求示例" size="small">
            <n-space vertical>
              <p class="hint">示例 1（captchaurn 格式）：</p>
              <n-code :code="captchaPayloadExample" language="json" word-wrap />
              <p class="hint">示例 2（字段映射格式）：</p>
              <n-code :code="mappedPayloadExample" language="json" word-wrap />
              <p class="hint">curl 示例：</p>
              <n-code :code="curlExample" language="bash" word-wrap />
            </n-space>
          </n-card>
        </n-space>
      </n-tab-pane>

      <n-tab-pane name="api-docs" tab="API文档">
        <n-space vertical size="large">
          <n-card title="接口总览" size="small">
            <p class="hint">Base URL：{{ apiBaseUrl }}</p>
            <ul class="api-list">
              <li>
                <code>POST /api/upload/ingest</code>
                ：外部平台上传账号到本系统（token 鉴权）。
              </li>
              <li>
                <code>GET /api/open/accounts</code>
                ：获取账号列表（开放 API，支持 keyword 查询）。
              </li>
              <li>
                <code>GET /api/open/accounts/:id/messages?mode=graph|imap</code>
                ：按账号 ID 获取全部邮件（开放 API）。
              </li>
              <li>
                <code>POST /api/open/messages</code>
                ：按账号 ID 或邮箱地址获取全部邮件（开放 API）。
              </li>
              <li>
                <code>GET /api/open/aliases?account=xxx@outlook.com</code>
                ：按主邮箱获取别名列表（开放 API）。
              </li>
              <li>
                <code>PATCH /api/open/aliases/:alias/remark</code>
                ：更新别名状态与备注（开放 API）。
              </li>
              <li>
                <code>PATCH /api/open/accounts/:id/remark</code>
                ：更新指定账号备注（开放 API）。
              </li>
              <li>
                <code>DELETE /api/open/accounts/:id</code>
                ：删除指定账号（开放 API，token 鉴权）。
              </li>
              <li>
                <code>POST /api/auth/login</code>
                ：后台登录，登录后可调用管理端 API。
              </li>
            </ul>
          </n-card>

          <n-card title="开放取件 API（Token 鉴权）" size="small">
            <n-space vertical>
              <p class="hint">支持 Header：{{ mailApiTokenHeader }} 或 Authorization: Bearer token。</p>
              <p class="hint">获取账号列表：</p>
              <n-code :code="openApiCurlListAccounts" language="bash" word-wrap />
              <p class="hint">按账号 ID 取件：</p>
              <n-code :code="openApiCurlById" language="bash" word-wrap />
              <p class="hint">按邮箱地址取件：</p>
              <n-code :code="openApiCurlByAccount" language="bash" word-wrap />
              <p class="hint">更新账号备注：</p>
              <n-code :code="openApiCurlUpdateRemark" language="bash" word-wrap />
              <p class="hint">获取别名列表：</p>
              <n-code :code="openApiCurlListAliases" language="bash" word-wrap />
              <p class="hint">更新别名状态：</p>
              <n-code :code="openApiCurlUpdateAliasRemark" language="bash" word-wrap />
              <p class="hint">删除账号：</p>
              <n-code :code="openApiCurlDeleteAccount" language="bash" word-wrap />
            </n-space>
          </n-card>

          <n-card title="管理端 API（登录会话）" size="small">
            <n-space vertical>
              <n-code :code="adminApiDoc" language="text" word-wrap />
              <p class="hint">登录并使用 Cookie 调用管理端接口：</p>
              <n-code :code="adminLoginCurl" language="bash" word-wrap />
            </n-space>
          </n-card>
        </n-space>
      </n-tab-pane>
    </n-tabs>
    </div>

    <div
      v-if="selectedWorkbenchMailDetail"
      class="workbench-detail-overlay"
      role="dialog"
      aria-modal="true"
      @click.self="closeWorkbenchMailDetail"
    >
      <section class="workbench-detail-panel">
        <header class="workbench-detail-header">
          <div>
            <span class="workbench-detail-kicker">{{ selectedWorkbenchMailDetail.modeLabel }} 邮件详情</span>
            <h2>{{ selectedWorkbenchMailDetail.subject }}</h2>
          </div>
          <button class="workbench-detail-close" type="button" title="关闭详情" @click="closeWorkbenchMailDetail">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M18 6 6 18" />
              <path d="m6 6 12 12" />
            </svg>
          </button>
        </header>

        <div class="workbench-detail-meta">
          <span>{{ selectedWorkbenchMailDetail.account }}</span>
          <span>{{ selectedWorkbenchMailDetail.from }}</span>
          <span>{{ formatMailDate(selectedWorkbenchMailDetail.receivedAt) }}</span>
          <span>{{ selectedWorkbenchMailDetail.contentKind === 'html' ? 'HTML 正文' : '文本正文' }}</span>
        </div>

        <div class="workbench-detail-body">
          <iframe
            v-if="selectedWorkbenchMailDetail.contentKind === 'html'"
            class="workbench-detail-frame"
            title="邮件 HTML 正文"
            sandbox=""
            referrerpolicy="no-referrer"
            :srcdoc="selectedWorkbenchMailDetail.content"
          />
          <pre v-else class="workbench-detail-text">{{ selectedWorkbenchMailDetail.content }}</pre>
        </div>
      </section>
    </div>

    <n-modal v-model:show="editVisible" preset="card" class="workbench-modal" title="编辑账号" style="max-width: 760px">
      <n-form label-placement="top">
        <n-grid :x-gap="12" :y-gap="12" :cols="24">
          <n-gi :span="12">
            <n-form-item label="账号">
              <n-input v-model:value="editForm.account" class="workbench-input" />
            </n-form-item>
          </n-gi>
          <n-gi :span="12">
            <n-form-item label="密码">
              <n-input v-model:value="editForm.password" class="workbench-input" type="password" show-password-on="click" />
            </n-form-item>
          </n-gi>
          <n-gi :span="12">
            <n-form-item label="Client ID">
              <n-input v-model:value="editForm.clientId" class="workbench-input" />
            </n-form-item>
          </n-gi>
          <n-gi :span="12">
            <n-form-item label="Refresh Token">
              <n-input v-model:value="editForm.refreshToken" class="workbench-input" />
            </n-form-item>
          </n-gi>
          <n-gi :span="24">
            <n-form-item label="备注">
              <n-input v-model:value="editForm.remark" class="workbench-input" />
            </n-form-item>
          </n-gi>
        </n-grid>
      </n-form>
      <template #footer>
        <n-space justify="end">
          <button class="workbench-action workbench-action-secondary" type="button" @click="editVisible = false">取消</button>
          <button class="workbench-action workbench-action-primary" type="button" :disabled="editLoading" @click="handleUpdateAccount">
            {{ editLoading ? '保存中' : '保存修改' }}
          </button>
        </n-space>
      </template>
    </n-modal>

    <n-modal v-model:show="importVisible" preset="card" class="workbench-modal workbench-import-modal" title="批量导入邮箱" style="max-width: 860px">
      <n-space vertical size="small">
        <p class="hint">每行一个账号：账号----密码 或 账号----密码----client_id----refresh_token</p>
        <n-input
          v-model:value="importText"
          type="textarea"
          class="workbench-input workbench-import-textarea"
          :autosize="{ minRows: 10, maxRows: 16 }"
          placeholder="account@hotmail.com----password----client_id----refresh_token"
        />
      </n-space>
      <template #footer>
        <n-space justify="space-between" align="center" wrap>
          <span class="hint">也可以直接选择 TXT 文件导入。</span>
          <n-space>
            <button class="workbench-action workbench-action-secondary" type="button" :disabled="importLoading" @click="triggerTxtImport">导入 TXT</button>
            <button class="workbench-action workbench-action-primary" type="button" :disabled="importLoading" @click="handleImport">
              {{ importLoading ? '导入中' : '导入文本' }}
            </button>
          </n-space>
        </n-space>
      </template>
    </n-modal>

    <n-modal
      v-model:show="aliasGenerateVisible"
      preset="card"
      :title="aliasGenerateMode === 'custom' ? '添加自定义别名' : '生成别名邮箱'"
      style="max-width: 520px"
    >
      <n-space vertical size="small">
        <p class="hint">{{ aliasGenerateHint }}</p>
        <p v-if="aliasGenerateMode === 'custom'" class="hint">自定义模式下也可勾选“补满 5 个”。</p>
        <n-checkbox v-model:checked="aliasFillToLimit">是否补满 5 个别名邮箱</n-checkbox>
        <n-input
          v-model:value="aliasCustomSuffix"
          placeholder="输入自定义后缀（不含 + 和 @）"
          clearable
        />
        <p class="hint">提示：别名邮箱生成后无法删除。</p>
      </n-space>
      <template #footer>
        <n-space justify="end">
          <n-button @click="closeAliasGenerateModal">取消</n-button>
          <n-button :loading="aliasGenerateLoading" @click="handleGenerateAliasRandom">生成随机</n-button>
          <n-button type="primary" :loading="aliasGenerateLoading" @click="handleCreateCustomAlias">
            添加自定义
          </n-button>
        </n-space>
      </template>
    </n-modal>

    <n-modal
      v-model:show="mailVisible"
      preset="card"
      :title="`邮箱取件(${mailCurrentModeLabel}) - ${mailAccount}`"
      style="width: min(1100px, 96vw)"
      @after-leave="handleMailModalAfterLeave"
    >
      <template #header-extra>
        <n-space size="small">
          <n-select
            v-model:value="mailCurrentMode"
            size="small"
            :options="mailModeOptions"
            style="width: 120px"
            :disabled="!currentMailAccountRow || mailLoading"
            @update:value="handleMailModeChange"
          />
          <n-popover
            trigger="click"
            placement="bottom-end"
            :show="mailCopyPopoverVisible"
            :width="104"
            @update:show="mailCopyPopoverVisible = $event"
          >
            <template #trigger>
              <n-button
                size="small"
                quaternary
                :disabled="!currentMailAccountRow"
                @click.stop
              >
                复制
              </n-button>
            </template>
            <div v-if="currentMailAccountRow" class="copy-popover">
              <n-button
                size="tiny"
                quaternary
                class="copy-action-btn"
                @click.stop="handleCopyAccountField(currentMailAccountRow, 'account', () => { mailCopyPopoverVisible = false; })"
              >
                复制账号
              </n-button>
              <n-button
                size="tiny"
                quaternary
                class="copy-action-btn"
                @click.stop="handleCopyAccountField(currentMailAccountRow, 'password', () => { mailCopyPopoverVisible = false; })"
              >
                复制密码({{ currentMailAccountRow.password.length }})
              </n-button>
              <n-button
                size="tiny"
                quaternary
                class="copy-action-btn"
                @click.stop="handleCopyAccountField(currentMailAccountRow, 'all', () => { mailCopyPopoverVisible = false; })"
              >
                复制全部
              </n-button>
            </div>
          </n-popover>
          <n-button
            size="small"
            secondary
            :loading="mailLoading"
            :disabled="!currentMailAccountRow"
            @click="handleRefreshMail"
          >
            刷新邮件
          </n-button>
        </n-space>
      </template>
      <div class="mail-modal-wrapper">
        <div class="mail-list-panel">
          <n-spin :show="mailLoading">
            <n-empty v-if="mailItems.length === 0" description="暂无邮件" />
            <div v-else class="mail-list">
              <button
                v-for="item in mailItems"
                :key="item.id"
                class="mail-item"
                :class="{ 'mail-item-active': selectedMail?.id === item.id }"
                type="button"
                @click="selectedMailId = item.id"
              >
                <p class="mail-item-subject">{{ item.subject || '(无主题)' }}</p>
                <p class="mail-item-meta">{{ item.from || '-' }}</p>
                <p class="mail-item-meta">{{ formatMailDate(item.receivedAt) }}</p>
              </button>
            </div>
          </n-spin>
        </div>
        <div class="mail-content-panel">
          <n-empty v-if="!selectedMail" description="请从左侧选择邮件" />
          <div v-else class="mail-content-block">
            <h3 class="mail-content-title">{{ selectedMail.subject || '(无主题)' }}</h3>
            <p class="mail-content-meta">发件人：{{ selectedMail.from || '-' }}</p>
            <p class="mail-content-meta">时间：{{ formatMailDate(selectedMail.receivedAt) }}</p>
            <div class="mail-content-text">{{ selectedMailText }}</div>
          </div>
        </div>
      </div>
    </n-modal>

    <footer v-if="viewMode === 'classic'" class="page-footer">
      <span class="footer-content">
        Copyright © 2026
        <a href="https://github.com/Msg-Lbo" target="_blank" rel="noopener noreferrer">Msg-Lbo</a>
        <span class="footer-separator">|</span>
        <a href="https://github.com/Msg-Lbo/microsoft-account-manager" target="_blank" rel="noopener noreferrer">
          项目 GitHub
        </a>
      </span>
    </footer>
  </div>
</template>

<script setup lang="ts">
import { computed, h, onMounted, reactive, ref, watch } from 'vue';
import {
  NButton,
  NCard,
  NCheckbox,
  NCode,
  NDataTable,
  NEmpty,
  NForm,
  NFormItem,
  NGi,
  NGrid,
  NInput,
  NModal,
  NPopover,
  NSelect,
  NSpace,
  NSpin,
  NTabPane,
  NTabs,
  NTag,
  createDiscreteApi,
  type DataTableColumns
} from 'naive-ui';
import { api, UnauthorizedError } from './api';
import type {
  AccountAliasItem,
  AccountItem,
  AccountMailItem,
  AccountPayload,
  BatchActionResult,
  IngestConfig,
  MailFetchMode
} from './types';
import {
  DEFAULT_WORKBENCH_PAGE_SIZE,
  WORKBENCH_PAGE_SIZE_OPTIONS,
  buildWorkbenchMailDetail,
  clampWorkbenchPageSize,
  filterWorkbenchAccounts,
  filterWorkbenchMailItems,
  formatWorkbenchAccountMeta,
  paginateWorkbenchAccounts,
  resolveWorkbenchFetchIds
} from './workbench';
import type { WorkbenchMailDetail } from './workbench';

const { message } = createDiscreteApi(['message']);

interface WorkbenchMailResult {
  accountId: number;
  account: string;
  mode: MailFetchMode;
  ok: boolean;
  messages: AccountMailItem[];
  error?: string;
}

const authLoading = ref(true);
const loginLoading = ref(false);
const logoutLoading = ref(false);
const isAuthenticated = ref(false);
const currentUser = ref('');
const siteOrigin = ref('');

const loginForm = reactive({
  username: 'admin',
  password: ''
});

const activeTab = ref<'accounts' | 'ingest' | 'api-docs'>('accounts');
const viewMode = ref<'workbench' | 'classic'>('workbench');

const accounts = ref<AccountItem[]>([]);
const searchKeyword = ref('');
const checkedRowKeys = ref<number[]>([]);
const currentWorkbenchAccountId = ref<number | null>(null);
const tablePageSize = ref<number>(20);
const workbenchPage = ref(1);
const workbenchPageSize = ref<number>(DEFAULT_WORKBENCH_PAGE_SIZE);
const workbenchMailKeyword = ref('');
const workbenchMailSender = ref('');
const workbenchMailLimit = ref(10);
const workbenchMailLoading = ref(false);
const aliasLimit = 5;
const aliasByAccountId = reactive<Record<number, AccountAliasItem[]>>({});
const aliasLoadingByAccountId = reactive<Record<number, boolean>>({});
const aliasPopoverVisibleByAccountId = reactive<Record<number, boolean>>({});
const copyPopoverVisibleByAccountId = reactive<Record<number, boolean>>({});
const aliasStatusLoadingByAliasId = reactive<Record<number, boolean>>({});
const exportPopoverVisible = ref(false);

const mailVisible = ref(false);
const mailLoading = ref(false);
const mailAccount = ref('');
const mailFetchMode = ref<MailFetchMode>('graph');
const mailCurrentMode = ref<MailFetchMode>('graph');
const mailItems = ref<AccountMailItem[]>([]);
const selectedMailId = ref('');
const mailCurrentAccountId = ref<number | null>(null);
const mailCurrentAlias = ref('');
const mailCopyPopoverVisible = ref(false);
const workbenchMailResults = ref<WorkbenchMailResult[]>([]);
const selectedWorkbenchMailDetail = ref<WorkbenchMailDetail | null>(null);

const aliasGenerateVisible = ref(false);
const aliasGenerateLoading = ref(false);
const aliasFillToLimit = ref(true);
const aliasCustomSuffix = ref('');
const aliasGenerateTargetAccountId = ref<number | null>(null);
const aliasGenerateMode = ref<'random' | 'custom'>('random');

const tableLoading = ref(false);
const createLoading = ref(false);
const editLoading = ref(false);
const importLoading = ref(false);
const saveIngestLoading = ref(false);
const syncLoading = ref(false);
const batchDeleteLoading = ref(false);

const importText = ref('');
const importVisible = ref(false);
const txtFileInputRef = ref<HTMLInputElement | null>(null);

const createForm = reactive<Required<AccountPayload>>({
  account: '',
  password: '',
  clientId: '',
  refreshToken: '',
  remark: ''
});

const editVisible = ref(false);
const editForm = reactive<Required<AccountPayload> & { id: number | null }>({
  id: null,
  account: '',
  password: '',
  clientId: '',
  refreshToken: '',
  remark: ''
});

const ingestConfig = reactive<IngestConfig>({
  delimiter: '----',
  captchaField: 'data',
  accountField: 'a',
  passwordField: 'p',
  clientIdField: 'c',
  tokenField: 't'
});

const ingestEndpointPath = ref('/api/upload/ingest');
const ingestTokenHeader = ref('x-ingest-token');
const mailApiTokenHeader = 'x-mail-api-token';

const rowKey = (row: AccountItem): number => row.id;

function resolveStatusLabel(row: AccountItem): string {
  const status = row.syncStatus || 'idle';
  if (status === 'refresh_success') {
    return '刷新OK';
  }
  if (status === 'refresh_failed') {
    return '刷新失败';
  }
  if (status === 'fetch_success') {
    return `取件(${row.fetchedCount ?? 0})`;
  }
  if (status === 'fetch_failed') {
    return '取件失败';
  }
  return '未处理';
}

function resolveStatusType(status: string): 'success' | 'error' | 'warning' | 'default' {
  if (status === 'refresh_success' || status === 'fetch_success') {
    return 'success';
  }
  if (status === 'refresh_failed' || status === 'fetch_failed') {
    return 'error';
  }
  if (status === 'running') {
    return 'warning';
  }
  return 'default';
}

const accountColumns: DataTableColumns<AccountItem> = [
  {
    type: 'selection',
    width: 42
  },
  {
    title: '账号',
    key: 'account',
    width: 190,
    ellipsis: { tooltip: true },
    render: (row) =>
      h(
        NButton,
        {
          text: true,
          type: 'primary',
          onClick: (event: MouseEvent) => {
            event.stopPropagation();
            void handleOpenMailModal(row);
          }
        },
        {
          default: () => row.account
        }
      )
  },
  {
    title: 'Client ID',
    key: 'clientId',
    width: 100,
    ellipsis: { tooltip: true },
    render: (row) => row.clientId ?? '-'
  },
  {
    title: 'Refresh Token',
    key: 'refreshToken',
    width: 100,
    ellipsis: { tooltip: true },
    render: (row) => row.refreshToken ?? '-'
  },
  {
    title: '备注',
    key: 'remark',
    width: 96,
    ellipsis: { tooltip: true },
    render: (row) => row.remark ?? '-'
  },
  {
    title: '状态',
    key: 'syncStatus',
    width: 80,
    render: (row) =>
      h(
        NTag,
        {
          size: 'small',
          type: resolveStatusType(row.syncStatus),
          title: row.syncMessage ?? resolveStatusLabel(row)
        },
        {
          default: () => resolveStatusLabel(row)
        }
      )
  },
  { title: '创建时间', key: 'createdAt', width: 165, ellipsis: { tooltip: true } },
  {
    title: '操作',
    key: 'actions',
    width: 243,
    fixed: 'right',
    render: (row) =>
      h('div', { class: 'action-cell' }, [
        h(
          NButton,
          {
            size: 'small',
            quaternary: true,
            type: 'primary',
            onClick: () => openEditModal(row)
          },
          { default: () => '编辑' }
        ),
        h(
          NButton,
          {
            size: 'small',
            quaternary: true,
            type: 'error',
            onClick: () => handleDeleteAccount(row.id)
          },
          { default: () => '删除' }
        ),
        h(
          NPopover,
          {
            trigger: 'click',
            placement: 'bottom-end',
            show: copyPopoverVisibleByAccountId[row.id] ?? false,
            width: 104,
            'onUpdate:show': (show: boolean) => {
              copyPopoverVisibleByAccountId[row.id] = show;
            }
          },
          {
            trigger: () =>
              h(
                NButton,
                {
                  size: 'small',
                  quaternary: true,
                  onClick: (event: MouseEvent) => {
                    event.stopPropagation();
                  }
                },
                { default: () => '复制' }
              ),
            default: () => renderCopyPopoverContent(row, () => {
              copyPopoverVisibleByAccountId[row.id] = false;
            })
          }
        ),
        h(
          NPopover,
          {
            trigger: 'click',
            placement: 'bottom-end',
            show: aliasPopoverVisibleByAccountId[row.id] ?? false,
            width: 620,
            'onUpdate:show': (show: boolean) => {
              void handleAliasPopoverVisibleChange(row, show);
            }
          },
          {
            trigger: () =>
              h(
                NButton,
                {
                  size: 'small',
                  quaternary: true,
                  type: 'info',
                  onClick: (event: MouseEvent) => {
                    event.stopPropagation();
                  }
                },
                { default: () => '别名' }
              ),
            default: () => renderAliasPopoverContent(row)
          }
        ),
        h('span', { class: 'alias-progress-indicator' }, resolveAliasProgressText(row))
      ])
  }
];

const tablePagination = computed(() => ({
  pageSize: tablePageSize.value,
  showSizePicker: true,
  pageSizes: [10, 20, 50, 100],
  onUpdatePageSize: (size: number) => {
    tablePageSize.value = size;
  }
}));

const workbenchPageSizeOptions = WORKBENCH_PAGE_SIZE_OPTIONS.map((size) => ({
  label: `每页 ${size}`,
  value: size
}));

const mailLimitOptions = [10, 20, 50, 100].map((size) => ({
  label: `${size} 封`,
  value: size
}));

const workbenchFilteredAccounts = computed(() =>
  filterWorkbenchAccounts(accounts.value, searchKeyword.value)
);

const workbenchPagination = computed(() =>
  paginateWorkbenchAccounts(workbenchFilteredAccounts.value, workbenchPage.value, workbenchPageSize.value)
);

const workbenchAccounts = computed(() => workbenchPagination.value.items);

const selectedWorkbenchRows = computed(() => {
  const fetchIds = resolveWorkbenchFetchIds(checkedRowKeys.value, currentWorkbenchAccountId.value);
  const selectedIds = new Set(fetchIds);
  return accounts.value.filter((item) => selectedIds.has(item.id));
});

const isWorkbenchPageAllChecked = computed(() => {
  return workbenchAccounts.value.length > 0 && workbenchAccounts.value.every((item) => checkedRowKeys.value.includes(item.id));
});

const isWorkbenchPagePartiallyChecked = computed(() => {
  const selectedCount = workbenchAccounts.value.filter((item) => checkedRowKeys.value.includes(item.id)).length;
  return selectedCount > 0 && selectedCount < workbenchAccounts.value.length;
});

const displayedWorkbenchMailResults = computed<WorkbenchMailResult[]>(() =>
  workbenchMailResults.value.map((result) => ({
    ...result,
    messages: result.ok
      ? filterWorkbenchMailItems(result.messages, {
          keyword: workbenchMailKeyword.value,
          sender: workbenchMailSender.value,
          limit: workbenchMailLimit.value
        })
      : result.messages
  }))
);

const selectedMail = computed(() => {
  return mailItems.value.find((item) => item.id === selectedMailId.value) ?? null;
});

const selectedMailText = computed(() => {
  if (!selectedMail.value) {
    return '';
  }

  const content = selectedMail.value.content || selectedMail.value.preview || '';
  if (selectedMail.value.contentType === 'html') {
    return htmlToText(content);
  }
  return content;
});

const currentMailAccountRow = computed(() => {
  if (!mailCurrentAccountId.value) {
    return null;
  }
  return accounts.value.find((item) => item.id === mailCurrentAccountId.value) ?? null;
});

const mailModeOptions: Array<{ label: string; value: MailFetchMode }> = [
  { label: 'Graph', value: 'graph' },
  { label: 'IMAP', value: 'imap' }
];

watch(searchKeyword, () => {
  workbenchPage.value = 1;
});

watch(workbenchPageSize, (size) => {
  workbenchPageSize.value = clampWorkbenchPageSize(size);
  workbenchPage.value = 1;
});

watch(workbenchPagination, (pagination) => {
  if (workbenchPage.value !== pagination.page) {
    workbenchPage.value = pagination.page;
  }
});

const mailCurrentModeLabel = computed(() => (mailCurrentMode.value === 'imap' ? 'IMAP' : 'Graph'));

const aliasGenerateHint = computed(() => {
  if (!aliasGenerateTargetAccountId.value) {
    return aliasGenerateMode.value === 'custom'
      ? '输入你要的别名后缀，系统会拼成 主邮箱+后缀@域名。'
      : '可生成随机 5 位后缀别名，也可添加自定义别名。';
  }

  const aliases = aliasByAccountId[aliasGenerateTargetAccountId.value] ?? [];
  const remain = Math.max(aliasLimit - aliases.length, 0);
  const customPrefix = aliasGenerateMode.value === 'custom' ? '当前为自定义模式。' : '';
  if (aliases.length === 0) {
    return `${customPrefix}当前没有别名，建议本次直接补满 5 个。`.trim();
  }
  if (remain === 0) {
    return `${customPrefix}当前已满 5 个别名。`.trim();
  }
  return `${customPrefix}当前已有 ${aliases.length} 个别名，本次最多可新增 ${remain} 个。`.trim();
});

const apiBaseUrl = computed(() => siteOrigin.value || 'https://your-domain');

const openApiCurlListAccounts = computed(() => {
  return `curl "${apiBaseUrl.value}/api/open/accounts?keyword=outlook" \\
  -H "${mailApiTokenHeader}: <MAIL_API_TOKEN>"`;
});

const openApiCurlById = computed(() => {
  return `curl "${apiBaseUrl.value}/api/open/accounts/1/messages?mode=graph" \\
  -H "${mailApiTokenHeader}: <MAIL_API_TOKEN>"`;
});

const openApiCurlByAccount = computed(() => {
  return `curl -X POST "${apiBaseUrl.value}/api/open/messages" \\
  -H "Content-Type: application/json" \\
  -H "${mailApiTokenHeader}: <MAIL_API_TOKEN>" \\
  -d '{"account":"example@outlook.com","mode":"imap"}'`;
});

const openApiCurlUpdateRemark = computed(() => {
  return `curl -X PATCH "${apiBaseUrl.value}/api/open/accounts/1/remark" \\
  -H "Content-Type: application/json" \\
  -H "${mailApiTokenHeader}: <MAIL_API_TOKEN>" \\
  -d '{"remark":"需要重点跟进"}'`;
});

const openApiCurlDeleteAccount = computed(() => {
  return `curl -X DELETE "${apiBaseUrl.value}/api/open/accounts/1" \\
  -H "${mailApiTokenHeader}: <MAIL_API_TOKEN>"`;
});

const openApiCurlListAliases = computed(() => {
  return `curl "${apiBaseUrl.value}/api/open/aliases?account=example@outlook.com" \\
  -H "${mailApiTokenHeader}: <MAIL_API_TOKEN>"`;
});

const openApiCurlUpdateAliasRemark = computed(() => {
  return `curl -X PATCH "${apiBaseUrl.value}/api/open/aliases/example%2Babcde%40outlook.com/remark" \\
  -H "Content-Type: application/json" \\
  -H "${mailApiTokenHeader}: <MAIL_API_TOKEN>" \\
  -d '{"isRegistered":true,"remark":"已注册"}'`;
});

const adminApiDoc = `POST /api/auth/login                     后台管理员登录
POST /api/auth/logout                    退出登录
GET  /api/auth/me                        获取当前登录用户
GET  /api/accounts                       获取账号列表
POST /api/accounts                       新增账号
PUT  /api/accounts/:id                   更新账号
DELETE /api/accounts/:id                 删除账号
POST /api/accounts/import                批量导入账号
PATCH /api/accounts/:id/remark           更新备注
GET  /api/accounts/:id/aliases           获取指定账号别名列表
POST /api/accounts/:id/aliases/generate  生成随机别名
POST /api/accounts/:id/aliases/custom    添加自定义别名
PATCH /api/accounts/:id/aliases/:aliasId 更新别名状态/备注
POST /api/accounts/refresh               刷新 refresh_token
GET  /api/accounts/:id/messages?mode=... 管理端按账号取件
GET  /api/ingest-config                  获取上传映射配置
PUT  /api/ingest-config                  保存上传映射配置`;

const adminLoginCurl = computed(() => {
  return `curl -c cookie.txt -X POST "${apiBaseUrl.value}/api/auth/login" \\
  -H "Content-Type: application/json" \\
  -d '{"username":"admin","password":"<ADMIN_PASSWORD>"}'

curl -b cookie.txt "${apiBaseUrl.value}/api/accounts"`;
});

const ingestEndpointUrl = computed(() =>
  siteOrigin.value ? `${siteOrigin.value}${ingestEndpointPath.value}` : ingestEndpointPath.value
);

const captchaPayloadExample = computed(() => {
  const key = ingestConfig.captchaField;
  const delimiter = ingestConfig.delimiter;
  const value = `your_account${delimiter}your_password${delimiter}your_client_id${delimiter}your_refresh_token`;
  return JSON.stringify({ [key]: value }, null, 2);
});

const mappedPayloadExample = computed(() =>
  JSON.stringify(
    {
      [ingestConfig.accountField]: 'your_account',
      [ingestConfig.passwordField]: 'your_password',
      [ingestConfig.clientIdField]: 'your_client_id',
      [ingestConfig.tokenField]: 'your_refresh_token'
    },
    null,
    2
  )
);

const curlExample = computed(() => {
  return `curl -X POST '${ingestEndpointUrl.value}' \\
  -H 'Content-Type: application/json' \\
  -H '${ingestTokenHeader.value}: <INGEST_TOKEN>' \\
  -d '${captchaPayloadExample.value.replace(/\n/g, '')}'`;
});

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return '发生未知错误';
}

function clearSessionState(): void {
  isAuthenticated.value = false;
  currentUser.value = '';
  accounts.value = [];
  checkedRowKeys.value = [];
  Object.keys(aliasByAccountId).forEach((key) => {
    delete aliasByAccountId[Number(key)];
  });
  Object.keys(aliasLoadingByAccountId).forEach((key) => {
    delete aliasLoadingByAccountId[Number(key)];
  });
  Object.keys(aliasPopoverVisibleByAccountId).forEach((key) => {
    delete aliasPopoverVisibleByAccountId[Number(key)];
  });
  Object.keys(copyPopoverVisibleByAccountId).forEach((key) => {
    delete copyPopoverVisibleByAccountId[Number(key)];
  });
  Object.keys(aliasStatusLoadingByAliasId).forEach((key) => {
    delete aliasStatusLoadingByAliasId[Number(key)];
  });
  mailVisible.value = false;
  mailLoading.value = false;
  mailAccount.value = '';
  mailFetchMode.value = 'graph';
  mailCurrentMode.value = 'graph';
  mailItems.value = [];
  selectedMailId.value = '';
  mailCurrentAccountId.value = null;
  mailCurrentAlias.value = '';
  viewMode.value = 'workbench';
  workbenchPage.value = 1;
  workbenchPageSize.value = DEFAULT_WORKBENCH_PAGE_SIZE;
  workbenchMailKeyword.value = '';
  workbenchMailSender.value = '';
  workbenchMailLimit.value = 10;
  workbenchMailLoading.value = false;
  workbenchMailResults.value = [];
  selectedWorkbenchMailDetail.value = null;
  importVisible.value = false;
  editVisible.value = false;
  aliasGenerateVisible.value = false;
  aliasGenerateLoading.value = false;
  aliasFillToLimit.value = true;
  aliasCustomSuffix.value = '';
  aliasGenerateTargetAccountId.value = null;
  aliasGenerateMode.value = 'random';
}

function handleApiError(error: unknown, showAuthWarning = true): void {
  if (error instanceof UnauthorizedError) {
    clearSessionState();
    if (showAuthWarning) {
      message.warning('登录已过期，请重新登录');
    }
    return;
  }

  message.error(getErrorMessage(error));
}

function handleCheckedRowKeysUpdate(keys: Array<number | string>): void {
  checkedRowKeys.value = keys
    .map((value) => Number(value))
    .filter((value) => Number.isInteger(value) && value > 0);
  if (checkedRowKeys.value.length > 0) {
    currentWorkbenchAccountId.value = null;
  }
}

function isAccountChecked(id: number): boolean {
  return checkedRowKeys.value.includes(id);
}

function handleWorkbenchRowChecked(id: number, checked: boolean): void {
  currentWorkbenchAccountId.value = null;
  if (checked) {
    if (!checkedRowKeys.value.includes(id)) {
      checkedRowKeys.value = [...checkedRowKeys.value, id];
    }
    return;
  }

  checkedRowKeys.value = checkedRowKeys.value.filter((value) => value !== id);
}

function handleWorkbenchRowCardClick(id: number): void {
  currentWorkbenchAccountId.value = id;
  checkedRowKeys.value = [];
}

function handleWorkbenchToggleCurrentPage(checked: boolean): void {
  currentWorkbenchAccountId.value = null;
  const pageIds = workbenchAccounts.value.map((item) => item.id);
  if (checked) {
    checkedRowKeys.value = Array.from(new Set([...checkedRowKeys.value, ...pageIds]));
    return;
  }

  const currentPageIds = new Set(pageIds);
  checkedRowKeys.value = checkedRowKeys.value.filter((id) => !currentPageIds.has(id));
}

function handleWorkbenchPageChange(page: number): void {
  workbenchPage.value = page;
}

function handleWorkbenchPageSizeChange(pageSize: number): void {
  workbenchPageSize.value = clampWorkbenchPageSize(pageSize);
}

function resolveWorkbenchRemark(row: AccountItem): string {
  const remark = row.remark?.trim();
  return remark ? `备注：${remark}` : '备注：暂无';
}

function resolveWorkbenchMeta(row: AccountItem): string {
  const aliasStats = getAliasStats(row);
  return formatWorkbenchAccountMeta({
    aliasRegistered: aliasStats.registered,
    aliasTotal: aliasStats.total,
    fetchedCount: row.fetchedCount
  });
}

function openWorkbenchMailDetail(result: WorkbenchMailResult, item: AccountMailItem): void {
  selectedWorkbenchMailDetail.value = buildWorkbenchMailDetail({
    account: result.account,
    mode: result.mode,
    item
  });
}

function closeWorkbenchMailDetail(): void {
  selectedWorkbenchMailDetail.value = null;
}

function getTargetAccountIds(all: boolean): number[] {
  if (all) {
    return [];
  }
  return checkedRowKeys.value;
}

function showBatchResult(prefix: string, result: BatchActionResult): void {
  if (result.failure === 0) {
    message.success(`${prefix}完成：成功 ${result.success}/${result.total}`);
  } else {
    message.warning(`${prefix}完成：成功 ${result.success}，失败 ${result.failure}`);
  }
}

function htmlToText(html: string): string {
  if (!html) {
    return '';
  }

  try {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    return (doc.body.textContent || '').trim();
  } catch {
    return html;
  }
}

function formatMailDate(value: string): string {
  if (!value) {
    return '-';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString();
}

function normalizePayload(payload: Required<AccountPayload>): AccountPayload {
  return {
    account: payload.account.trim(),
    password: payload.password.trim(),
    clientId: payload.clientId.trim(),
    refreshToken: payload.refreshToken.trim(),
    remark: payload.remark.trim()
  };
}

function buildAccountsExportText(items: AccountItem[]): string {
  return items
    .map((item) => [item.account, item.password, item.clientId ?? '', item.refreshToken ?? ''].join('----'))
    .join('\n');
}

function buildExportFilename(all: boolean): string {
  const now = new Date();
  const parts = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, '0'),
    String(now.getDate()).padStart(2, '0'),
    String(now.getHours()).padStart(2, '0'),
    String(now.getMinutes()).padStart(2, '0'),
    String(now.getSeconds()).padStart(2, '0')
  ];
  return `账号导出-${all ? '全部' : '勾选'}-${parts.join('')}.txt`;
}

function downloadTxtFile(filename: string, content: string): void {
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function clearCreateForm(): void {
  createForm.account = '';
  createForm.password = '';
  createForm.clientId = '';
  createForm.refreshToken = '';
  createForm.remark = '';
}

function openEditModal(row: AccountItem): void {
  editForm.id = row.id;
  editForm.account = row.account;
  editForm.password = row.password;
  editForm.clientId = row.clientId ?? '';
  editForm.refreshToken = row.refreshToken ?? '';
  editForm.remark = row.remark ?? '';
  editVisible.value = true;
}

function getAliasesByAccountId(accountId: number): AccountAliasItem[] {
  return aliasByAccountId[accountId] ?? [];
}

function getAliasStats(row: AccountItem): { total: number; registered: number } {
  const aliases = aliasByAccountId[row.id];
  if (aliases) {
    const total = aliases.length;
    const registered = aliases.reduce((count, item) => count + (item.isRegistered ? 1 : 0), 0);
    return { total, registered };
  }

  const total = Math.max(Number(row.aliasCount ?? 0), 0);
  const registered = Math.min(Math.max(Number(row.aliasRegisteredCount ?? 0), 0), total);
  return { total, registered };
}

function resolveAliasProgressText(row: AccountItem): string {
  const { total, registered } = getAliasStats(row);
  if (total <= 0) {
    return '(0/0)';
  }
  return `(${registered}/${total})`;
}

function resolveAliasStatusType(isRegistered: boolean): 'success' | 'warning' {
  return isRegistered ? 'success' : 'warning';
}

function buildAccountCopyText(row: AccountItem, type: 'account' | 'password' | 'all'): string {
  if (type === 'account') {
    return row.account;
  }
  if (type === 'password') {
    return row.password;
  }
  return [row.account, row.password, row.clientId ?? '', row.refreshToken ?? ''].join('----');
}

async function handleCopyAccountField(
  row: AccountItem,
  type: 'account' | 'password' | 'all',
  onSuccess?: () => void
): Promise<void> {
  const copied = await handleCopyText(buildAccountCopyText(row, type));
  if (copied) {
    onSuccess?.();
  }
}

async function loadAliasesForAccount(row: AccountItem, force = false): Promise<void> {
  if (!force && aliasByAccountId[row.id]) {
    return;
  }

  aliasLoadingByAccountId[row.id] = true;
  try {
    const response = await api.listAccountAliases(row.id);
    aliasByAccountId[row.id] = response.items;
  } catch (error) {
    handleApiError(error, false);
  } finally {
    aliasLoadingByAccountId[row.id] = false;
  }
}

async function handleAliasPopoverVisibleChange(row: AccountItem, show: boolean): Promise<void> {
  aliasPopoverVisibleByAccountId[row.id] = show;
  if (show) {
    await loadAliasesForAccount(row, false);
  }
}

async function openAliasGenerateModal(row: AccountItem, mode: 'random' | 'custom' = 'random'): Promise<void> {
  await loadAliasesForAccount(row, false);
  aliasGenerateTargetAccountId.value = row.id;
  aliasGenerateMode.value = mode;
  aliasGenerateVisible.value = true;
  aliasGenerateLoading.value = false;
  aliasFillToLimit.value = true;
  aliasCustomSuffix.value = '';
}

function closeAliasGenerateModal(): void {
  aliasGenerateVisible.value = false;
  aliasGenerateLoading.value = false;
  aliasCustomSuffix.value = '';
  aliasGenerateTargetAccountId.value = null;
  aliasGenerateMode.value = 'random';
}

function renderCopyPopoverContent(row: AccountItem, onSuccess?: () => void) {
  return h('div', { class: 'copy-popover' }, [
    h(
      NButton,
      {
        size: 'tiny',
        quaternary: true,
        class: 'copy-action-btn',
        onClick: (event: MouseEvent) => {
          event.stopPropagation();
          void handleCopyAccountField(row, 'account', onSuccess);
        }
      },
      { default: () => '复制账号' }
    ),
    h(
      NButton,
      {
        size: 'tiny',
        quaternary: true,
        class: 'copy-action-btn',
        onClick: (event: MouseEvent) => {
          event.stopPropagation();
          void handleCopyAccountField(row, 'password', onSuccess);
        }
      },
      { default: () => `复制密码(${row.password.length})` }
    ),
    h(
      NButton,
      {
        size: 'tiny',
        quaternary: true,
        class: 'copy-action-btn',
        onClick: (event: MouseEvent) => {
          event.stopPropagation();
          void handleCopyAccountField(row, 'all', onSuccess);
        }
      },
      { default: () => '复制全部' }
    )
  ]);
}

function renderAliasPopoverContent(row: AccountItem) {
  const aliases = getAliasesByAccountId(row.id);
  const remain = Math.max(aliasLimit - aliases.length, 0);
  const canCreate = remain > 0;
  const loading = aliasLoadingByAccountId[row.id] ?? false;

  return h('div', { class: 'alias-popover' }, [
    h('div', { class: 'alias-popover-header' }, [
      h('span', { class: 'alias-popover-title' }, `别名 ${aliases.length}/${aliasLimit}`),
      canCreate
        ? h(
            NButton,
            {
              size: 'tiny',
              type: 'primary',
              secondary: true,
              onClick: (event: MouseEvent) => {
                event.stopPropagation();
                void openAliasGenerateModal(row, 'random');
              }
            },
            { default: () => '生成别名邮箱' }
          )
        : null
    ]),
    canCreate
      ? h(
          NButton,
          {
            size: 'tiny',
            quaternary: true,
            type: 'info',
            class: 'alias-custom-trigger',
            onClick: (event: MouseEvent) => {
              event.stopPropagation();
              void openAliasGenerateModal(row, 'custom');
            }
          },
          { default: () => '添加自定义' }
        )
      : null,
    loading
      ? h(
          'div',
          { class: 'alias-loading' },
          h(NSpin, { show: true, size: 'small' })
        )
      : aliases.length === 0
        ? h(NEmpty, { description: '暂无别名邮箱', size: 'small' })
        : h(
            'div',
            { class: 'alias-list' },
            aliases.map((alias) =>
              h('div', { key: alias.id, class: 'alias-row' }, [
                h(
                  NButton,
                  {
                    text: true,
                    type: 'primary',
                    class: 'alias-address',
                    onClick: (event: MouseEvent) => {
                      event.stopPropagation();
                      void handleOpenAliasMailModal(row, alias.aliasEmail);
                    }
                  },
                  { default: () => alias.aliasEmail }
                ),
                h(
                  NTag,
                  {
                    class: 'alias-status-tag',
                    size: 'small',
                    type: resolveAliasStatusType(alias.isRegistered)
                  },
                  { default: () => (alias.isRegistered ? '已注册' : '未注册') }
                ),
                h(
                  NButton,
                  {
                    size: 'tiny',
                    quaternary: true,
                    type: alias.isRegistered ? 'warning' : 'success',
                    class: 'alias-toggle-btn',
                    loading: aliasStatusLoadingByAliasId[alias.id] ?? false,
                    onClick: (event: MouseEvent) => {
                      event.stopPropagation();
                      void handleToggleAliasStatus(row, alias);
                    }
                  },
                  { default: () => (alias.isRegistered ? '标记未用' : '标记已用') }
                ),
                h(
                  NButton,
                  {
                    size: 'tiny',
                    class: 'alias-copy-btn',
                    onClick: (event: MouseEvent) => {
                      event.stopPropagation();
                      void handleCopyText(alias.aliasEmail);
                    }
                  },
                  { default: () => '复制' }
                )
              ])
            )
          )
  ]);
}

async function handleGenerateAliasRandom(): Promise<void> {
  if (!aliasGenerateTargetAccountId.value) {
    return;
  }

  const accountId = aliasGenerateTargetAccountId.value;
  const aliases = getAliasesByAccountId(accountId);
  const remain = Math.max(aliasLimit - aliases.length, 0);
  if (remain <= 0) {
    message.warning(`别名数量已满 ${aliasLimit} 个`);
    return;
  }

  aliasGenerateLoading.value = true;
  try {
    const response = await api.generateAccountAliases(accountId, {
      fillToLimit: aliasFillToLimit.value,
      count: aliasFillToLimit.value ? undefined : 1
    });
    aliasByAccountId[accountId] = response.items;
    if (response.created.length > 0) {
      message.success(`已生成 ${response.created.length} 个别名`);
    } else {
      message.warning('没有生成新的别名');
    }
    closeAliasGenerateModal();
  } catch (error) {
    handleApiError(error);
    aliasGenerateLoading.value = false;
  }
}

async function handleCreateCustomAlias(): Promise<void> {
  if (!aliasGenerateTargetAccountId.value) {
    return;
  }

  const suffix = aliasCustomSuffix.value.trim();
  if (!suffix) {
    message.warning('请输入自定义别名后缀');
    return;
  }

  aliasGenerateLoading.value = true;
  try {
    const response = await api.createCustomAlias(aliasGenerateTargetAccountId.value, {
      suffix,
      fillToLimit: aliasFillToLimit.value
    });
    aliasByAccountId[aliasGenerateTargetAccountId.value] = response.items;
    message.success(`新增成功，本次共创建 ${response.created.length} 个别名`);
    closeAliasGenerateModal();
  } catch (error) {
    handleApiError(error);
    aliasGenerateLoading.value = false;
  }
}

async function handleToggleAliasStatus(row: AccountItem, alias: AccountAliasItem): Promise<void> {
  aliasStatusLoadingByAliasId[alias.id] = true;
  try {
    const response = await api.updateAccountAlias(row.id, alias.id, {
      isRegistered: !alias.isRegistered
    });
    const list = getAliasesByAccountId(row.id);
    aliasByAccountId[row.id] = list.map((item) => (item.id === alias.id ? response.item : item));
    message.success(response.item.isRegistered ? '已标记为已注册' : '已标记为未注册');
  } catch (error) {
    handleApiError(error);
  } finally {
    aliasStatusLoadingByAliasId[alias.id] = false;
  }
}

async function handleCopyText(value: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(value);
    message.success('已复制');
    return true;
  } catch {
    message.error('复制失败，请手动复制');
    return false;
  }
}

async function loadAccounts(): Promise<void> {
  tableLoading.value = true;
  try {
    const response = await api.listAccounts(searchKeyword.value.trim());
    accounts.value = response.items;
    const available = new Set(response.items.map((item) => item.id));
    checkedRowKeys.value = checkedRowKeys.value.filter((id) => available.has(id));
    if (currentWorkbenchAccountId.value && !available.has(currentWorkbenchAccountId.value)) {
      currentWorkbenchAccountId.value = null;
    }
    Object.keys(aliasByAccountId).forEach((key) => {
      const id = Number(key);
      if (!available.has(id)) {
        delete aliasByAccountId[id];
        delete aliasLoadingByAccountId[id];
        delete aliasPopoverVisibleByAccountId[id];
        delete copyPopoverVisibleByAccountId[id];
      }
    });
  } catch (error) {
    handleApiError(error);
  } finally {
    tableLoading.value = false;
  }
}

async function loadIngestConfig(): Promise<void> {
  try {
    const response = await api.getIngestConfig();
    ingestConfig.delimiter = response.item.delimiter;
    ingestConfig.captchaField = response.item.captchaField;
    ingestConfig.accountField = response.item.accountField;
    ingestConfig.passwordField = response.item.passwordField;
    ingestConfig.clientIdField = response.item.clientIdField;
    ingestConfig.tokenField = response.item.tokenField;
    ingestEndpointPath.value = response.endpointPath;
    ingestTokenHeader.value = response.tokenHeader;
  } catch (error) {
    handleApiError(error);
  }
}

async function loadInitialData(): Promise<void> {
  await Promise.all([loadAccounts(), loadIngestConfig()]);
}

async function handleLogin(): Promise<void> {
  const username = loginForm.username.trim();
  const password = loginForm.password;

  if (!username || !password) {
    message.warning('请填写用户名和密码');
    return;
  }

  loginLoading.value = true;
  try {
    const response = await api.login({ username, password });
    isAuthenticated.value = true;
    currentUser.value = response.username;
    await loadInitialData();
    loginForm.password = '';
    message.success('登录成功');
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      message.error(error.message);
    } else {
      message.error(getErrorMessage(error));
    }
  } finally {
    loginLoading.value = false;
  }
}

async function handleLogout(): Promise<void> {
  logoutLoading.value = true;
  try {
    await api.logout();
    message.success('已退出登录');
  } catch (error) {
    if (!(error instanceof UnauthorizedError)) {
      message.error(getErrorMessage(error));
    }
  } finally {
    logoutLoading.value = false;
    clearSessionState();
    loginForm.password = '';
  }
}

async function handleCreateAccount(): Promise<void> {
  const payload = normalizePayload(createForm);
  if (!payload.account || !payload.password) {
    message.warning('账号和密码必填');
    return;
  }

  createLoading.value = true;
  try {
    await api.createAccount(payload);
    clearCreateForm();
    await loadAccounts();
    message.success('账号已保存');
  } catch (error) {
    handleApiError(error);
  } finally {
    createLoading.value = false;
  }
}

async function handleUpdateAccount(): Promise<void> {
  if (!editForm.id) {
    return;
  }

  const payload = normalizePayload(editForm);
  if (!payload.account || !payload.password) {
    message.warning('账号和密码必填');
    return;
  }

  editLoading.value = true;
  try {
    await api.updateAccount(editForm.id, payload);
    editVisible.value = false;
    await loadAccounts();
    message.success('账号已更新');
  } catch (error) {
    handleApiError(error);
  } finally {
    editLoading.value = false;
  }
}

async function handleDeleteAccount(id: number): Promise<void> {
  const confirmed = window.confirm('确认删除该账号？');
  if (!confirmed) {
    return;
  }

  try {
    await api.deleteAccount(id);
    await loadAccounts();
    message.success('账号已删除');
  } catch (error) {
    handleApiError(error);
  }
}

function openImportModal(): void {
  importVisible.value = true;
}

function triggerTxtImport(): void {
  txtFileInputRef.value?.click();
}

async function handleTxtFileChange(event: Event): Promise<void> {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) {
    return;
  }

  try {
    const text = await file.text();
    const imported = await importAccountsText(text, `TXT 文件 ${file.name}`);
    if (imported) {
      importVisible.value = false;
    }
  } finally {
    input.value = '';
  }
}

async function importAccountsText(rawText: string, sourceLabel: string): Promise<boolean> {
  const text = rawText.trim();
  if (!text) {
    message.warning(`${sourceLabel} 内容为空`);
    return false;
  }

  importLoading.value = true;
  try {
    const result = await api.importAccounts(text);
    await loadAccounts();
    importText.value = '';
    message.success(`${sourceLabel} 导入完成：新增 ${result.inserted}，跳过 ${result.skipped}`);
    if (result.errors.length > 0) {
      message.warning(`有 ${result.errors.length} 行格式错误，已跳过`);
    }
    return true;
  } catch (error) {
    handleApiError(error);
    return false;
  } finally {
    importLoading.value = false;
  }
}

async function handleImport(): Promise<void> {
  const imported = await importAccountsText(importText.value, '文本内容');
  if (imported) {
    importVisible.value = false;
  }
}

function handleExportAccounts(all: boolean): void {
  const targetItems = all
    ? accounts.value
    : accounts.value.filter((item) => checkedRowKeys.value.includes(item.id));

  if (!all && targetItems.length === 0) {
    message.warning('请先勾选要导出的账号');
    return;
  }

  if (all && targetItems.length === 0) {
    message.warning('当前没有可导出的账号');
    return;
  }

  downloadTxtFile(buildExportFilename(all), buildAccountsExportText(targetItems));
  exportPopoverVisible.value = false;
  message.success(all ? `已导出全部 ${targetItems.length} 条账号` : `已导出 ${targetItems.length} 条勾选账号`);
}

async function handleRefreshAccounts(all: boolean): Promise<void> {
  const accountIds = getTargetAccountIds(all);
  if (!all && accountIds.length === 0) {
    message.warning('请先勾选需要刷新的账号');
    return;
  }

  syncLoading.value = true;
  try {
    const result = await api.refreshAccounts({
      accountIds: all ? undefined : accountIds
    });
    await loadAccounts();
    showBatchResult('刷新', result);
  } catch (error) {
    handleApiError(error);
  } finally {
    syncLoading.value = false;
  }
}

async function fetchWorkbenchMailForRows(rows: AccountItem[]): Promise<void> {
  if (rows.length === 0) {
    message.warning('没有可取件的邮箱');
    return;
  }

  workbenchMailLoading.value = true;
  workbenchMailResults.value = [];
  selectedWorkbenchMailDetail.value = null;
  const results: WorkbenchMailResult[] = [];

  try {
    for (const row of rows) {
      try {
        const response = await api.getAccountMessages(row.id, mailFetchMode.value);
        results.push({
          accountId: row.id,
          account: response.account,
          mode: response.mode,
          ok: true,
          messages: response.messages
        });
      } catch (error) {
        if (error instanceof UnauthorizedError) {
          handleApiError(error);
          return;
        }

        results.push({
          accountId: row.id,
          account: row.account,
          mode: mailFetchMode.value,
          ok: false,
          messages: [],
          error: getErrorMessage(error)
        });
      }

      workbenchMailResults.value = [...results];
    }

    await loadAccounts();
    const failed = results.filter((item) => !item.ok).length;
    if (failed === 0) {
      message.success(`取件完成：${results.length} 个邮箱`);
    } else {
      message.warning(`取件完成：成功 ${results.length - failed}，失败 ${failed}`);
    }
  } finally {
    workbenchMailLoading.value = false;
  }
}

async function handleWorkbenchFetchSelected(): Promise<void> {
  await fetchWorkbenchMailForRows(selectedWorkbenchRows.value);
}

async function handleWorkbenchFetchAll(): Promise<void> {
  await fetchWorkbenchMailForRows(workbenchFilteredAccounts.value);
}

function handleSelectAll(): void {
  checkedRowKeys.value = accounts.value.map((item) => item.id);
  message.success(`已选中 ${checkedRowKeys.value.length} 条账号`);
}

function handleSelectInverse(): void {
  const currentIds = new Set(checkedRowKeys.value);
  checkedRowKeys.value = accounts.value
    .map((item) => item.id)
    .filter((id) => !currentIds.has(id));
  message.success(`反选完成，已选中 ${checkedRowKeys.value.length} 条账号`);
}

async function handleBatchDelete(): Promise<void> {
  if (checkedRowKeys.value.length === 0) {
    message.warning('请先选择要删除的账号');
    return;
  }

  const confirmed = window.confirm(`确认删除选中的 ${checkedRowKeys.value.length} 条账号？此操作不可恢复！`);
  if (!confirmed) {
    return;
  }

  batchDeleteLoading.value = true;
  try {
    const result = await api.batchDeleteAccounts({
      accountIds: checkedRowKeys.value
    });
    await loadAccounts();
    if (result.deleted > 0) {
      message.success(`删除完成：成功删除 ${result.deleted}/${result.total} 条`);
    } else {
      message.warning('没有账号被删除');
    }
  } catch (error) {
    handleApiError(error);
  } finally {
    batchDeleteLoading.value = false;
  }
}

async function fetchMailMessages(
  accountId: number,
  account: string,
  alias = '',
  mode: MailFetchMode = mailFetchMode.value
): Promise<void> {
  mailLoading.value = true;
  mailAccount.value = alias || account;
  mailCurrentMode.value = mode;
  mailItems.value = [];
  selectedMailId.value = '';

  try {
    const response = await api.getAccountMessages(accountId, mode, alias || undefined);
    mailAccount.value = response.account;
    mailCurrentMode.value = response.mode;
    mailItems.value = response.messages;
    selectedMailId.value = response.messages[0]?.id ?? '';
    await loadAccounts();
  } catch (error) {
    handleApiError(error);
  } finally {
    mailLoading.value = false;
  }
}

async function handleOpenMailModal(row: AccountItem, alias = ''): Promise<void> {
  mailVisible.value = true;
  mailCurrentAccountId.value = row.id;
  mailCurrentAlias.value = alias;
  await fetchMailMessages(row.id, row.account, alias, mailFetchMode.value);
}

async function handleOpenAliasMailModal(row: AccountItem, aliasEmail: string): Promise<void> {
  aliasPopoverVisibleByAccountId[row.id] = false;
  await handleOpenMailModal(row, aliasEmail);
}

async function handleRefreshMail(): Promise<void> {
  const currentRow = currentMailAccountRow.value;
  if (!currentRow) {
    message.warning('当前账号不存在，请刷新列表后重试');
    return;
  }

  await fetchMailMessages(currentRow.id, currentRow.account, mailCurrentAlias.value, mailCurrentMode.value);
}

async function handleMailModeChange(mode: MailFetchMode): Promise<void> {
  const currentRow = currentMailAccountRow.value;
  if (!currentRow) {
    return;
  }

  mailFetchMode.value = mode;
  await fetchMailMessages(currentRow.id, currentRow.account, mailCurrentAlias.value, mode);
}

function handleMailModalAfterLeave(): void {
  mailCurrentAccountId.value = null;
  mailCurrentAlias.value = '';
  mailItems.value = [];
  selectedMailId.value = '';
  mailCopyPopoverVisible.value = false;
}

async function handleSaveIngestConfig(): Promise<void> {
  saveIngestLoading.value = true;
  try {
    const response = await api.updateIngestConfig({
      delimiter: ingestConfig.delimiter.trim(),
      captchaField: ingestConfig.captchaField.trim(),
      accountField: ingestConfig.accountField.trim(),
      passwordField: ingestConfig.passwordField.trim(),
      clientIdField: ingestConfig.clientIdField.trim(),
      tokenField: ingestConfig.tokenField.trim()
    });
    ingestConfig.delimiter = response.item.delimiter;
    ingestConfig.captchaField = response.item.captchaField;
    ingestConfig.accountField = response.item.accountField;
    ingestConfig.passwordField = response.item.passwordField;
    ingestConfig.clientIdField = response.item.clientIdField;
    ingestConfig.tokenField = response.item.tokenField;
    message.success('上传映射配置已保存');
  } catch (error) {
    handleApiError(error);
  } finally {
    saveIngestLoading.value = false;
  }
}

onMounted(async () => {
  siteOrigin.value = window.location.origin;

  authLoading.value = true;
  try {
    const me = await api.getMe();
    isAuthenticated.value = true;
    currentUser.value = me.username;
    await loadInitialData();
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      clearSessionState();
    } else {
      message.error(getErrorMessage(error));
    }
  } finally {
    authLoading.value = false;
  }
});
</script>
