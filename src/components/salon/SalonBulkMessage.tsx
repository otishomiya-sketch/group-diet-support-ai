"use client";

import { useEffect, useState } from "react";

interface SalonCustomer {
  userId: string;
  displayName: string;
  achievementRate: number;
}

interface Template {
  id: string;
  title: string;
  body: string;
  createdAt: string;
}

interface BulkSendOutcome {
  customerUserId: string;
  ok: boolean;
  error?: string;
}

interface SalonBulkMessageProps {
  customers: SalonCustomer[];
  /** "/api/salon"(スタッフ用・自分のサロン)または"/api/admin/salon/{id}"(運営用・任意サロン)。 */
  apiBasePath?: string;
}

export function SalonBulkMessage({ customers, apiBasePath = "/api/salon" }: SalonBulkMessageProps) {
  const [templates, setTemplates] = useState<Template[] | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const [templateFormOpen, setTemplateFormOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newBody, setNewBody] = useState("");
  const [creatingTemplate, setCreatingTemplate] = useState(false);

  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [customText, setCustomText] = useState("");
  const [selectedCustomerIds, setSelectedCustomerIds] = useState<string[]>([]);
  const [sending, setSending] = useState(false);
  const [sendResults, setSendResults] = useState<BulkSendOutcome[] | null>(null);
  const [sendError, setSendError] = useState<string | null>(null);

  useEffect(() => {
    let ignore = false;
    fetch(`${apiBasePath}/templates`)
      .then((res) => res.json())
      .then((data) => {
        if (!ignore) setTemplates(data.templates ?? []);
      });
    return () => {
      ignore = true;
    };
  }, [apiBasePath, refreshKey]);

  function toggleCustomer(userId: string) {
    setSelectedCustomerIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId],
    );
  }

  async function createTemplate() {
    setCreatingTemplate(true);
    const res = await fetch(`${apiBasePath}/templates`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: newTitle, body: newBody }),
    });
    setCreatingTemplate(false);
    if (res.ok) {
      setNewTitle("");
      setNewBody("");
      setTemplateFormOpen(false);
      setRefreshKey((k) => k + 1);
    }
  }

  async function deleteTemplate(id: string) {
    await fetch(`${apiBasePath}/templates/${id}`, { method: "DELETE" });
    if (selectedTemplateId === id) setSelectedTemplateId(null);
    setRefreshKey((k) => k + 1);
  }

  async function sendBulk() {
    setSending(true);
    setSendError(null);
    setSendResults(null);
    const res = await fetch(`${apiBasePath}/message/bulk`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        customerUserIds: selectedCustomerIds,
        templateId: selectedTemplateId,
        text: selectedTemplateId ? undefined : customText,
      }),
    });
    const json = await res.json();
    setSending(false);
    if (!res.ok) {
      setSendError(json.error ?? "送信に失敗しました。");
      return;
    }
    setSendResults(json.results);
  }

  const canSend =
    selectedCustomerIds.length > 0 && (selectedTemplateId !== null || customText.trim().length > 0);

  return (
    <section className="rounded-lg border border-violet-300 bg-violet-50 p-6 dark:border-violet-800 dark:bg-violet-950/30">
      <h2 className="mb-3 text-lg font-semibold text-zinc-900 dark:text-zinc-50">
        📨 テンプレート一斉送信
      </h2>

      <div className="mb-4">
        <div className="mb-2 flex items-center justify-between">
          <p className="text-xs font-medium text-zinc-600 dark:text-zinc-300">定型文テンプレート</p>
          <button
            onClick={() => setTemplateFormOpen((v) => !v)}
            className="rounded-full border border-violet-400 px-3 py-1 text-xs text-violet-700 hover:bg-violet-100 dark:text-violet-300 dark:hover:bg-violet-900"
          >
            + 新規作成
          </button>
        </div>

        {templateFormOpen && (
          <div className="mb-3 flex flex-col gap-2 rounded-md bg-white p-3 dark:bg-zinc-900">
            <input
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="テンプレート名(例:来月キャンペーン案内)"
              className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-950"
            />
            <textarea
              value={newBody}
              onChange={(e) => setNewBody(e.target.value)}
              rows={3}
              maxLength={1000}
              placeholder="本文"
              className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-950"
            />
            <div className="flex gap-2">
              <button
                onClick={createTemplate}
                disabled={creatingTemplate || !newTitle.trim() || !newBody.trim()}
                className="rounded-full bg-violet-600 px-4 py-1.5 text-xs text-white hover:bg-violet-700 disabled:opacity-50"
              >
                保存
              </button>
              <button
                onClick={() => setTemplateFormOpen(false)}
                className="rounded-full border border-zinc-300 px-4 py-1.5 text-xs hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
              >
                キャンセル
              </button>
            </div>
          </div>
        )}

        <ul className="flex flex-col gap-1">
          {(templates ?? []).map((t) => (
            <li
              key={t.id}
              className={
                selectedTemplateId === t.id
                  ? "flex items-center justify-between rounded-md border-2 border-violet-500 bg-white px-3 py-2 dark:bg-zinc-900"
                  : "flex items-center justify-between rounded-md border border-transparent bg-white px-3 py-2 dark:bg-zinc-900"
              }
            >
              <button
                onClick={() => setSelectedTemplateId(selectedTemplateId === t.id ? null : t.id)}
                className="flex-1 text-left"
              >
                <span className="block text-sm font-medium text-zinc-900 dark:text-zinc-50">
                  {t.title}
                </span>
                <span className="block truncate text-xs text-zinc-500">{t.body}</span>
              </button>
              <button
                onClick={() => deleteTemplate(t.id)}
                className="ml-2 text-xs text-red-500 hover:text-red-600"
              >
                削除
              </button>
            </li>
          ))}
          {templates && templates.length === 0 && !templateFormOpen && (
            <p className="text-xs text-zinc-500">テンプレートがまだありません。</p>
          )}
        </ul>
      </div>

      {selectedTemplateId === null && (
        <label className="mb-4 flex flex-col gap-1 text-xs font-medium text-zinc-600 dark:text-zinc-300">
          または、自由入力で送信する本文
          <textarea
            value={customText}
            onChange={(e) => setCustomText(e.target.value)}
            rows={3}
            maxLength={1000}
            placeholder="テンプレートを選ばない場合はここに入力"
            className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm font-normal dark:border-zinc-700 dark:bg-zinc-900"
          />
        </label>
      )}

      <p className="mb-2 text-xs font-medium text-zinc-600 dark:text-zinc-300">送信先の顧客を選択</p>
      <ul className="mb-4 flex max-h-56 flex-col gap-1 overflow-y-auto rounded-md bg-white p-2 dark:bg-zinc-900">
        {customers.map((c) => (
          <li key={c.userId}>
            <label className="flex cursor-pointer items-center gap-2 rounded px-2 py-1 text-sm hover:bg-zinc-50 dark:hover:bg-zinc-800">
              <input
                type="checkbox"
                checked={selectedCustomerIds.includes(c.userId)}
                onChange={() => toggleCustomer(c.userId)}
              />
              {c.displayName}
            </label>
          </li>
        ))}
        {customers.length === 0 && <p className="px-2 py-1 text-xs text-zinc-500">顧客がまだいません。</p>}
      </ul>

      <button
        onClick={sendBulk}
        disabled={!canSend || sending}
        className="rounded-full bg-violet-600 px-5 py-2 text-sm text-white hover:bg-violet-700 disabled:opacity-50"
      >
        {sending ? "送信中..." : `選択した${selectedCustomerIds.length}名に送信`}
      </button>

      {sendError && <p className="mt-3 text-sm text-red-600 dark:text-red-400">{sendError}</p>}
      {sendResults && (
        <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-300">
          送信完了:成功 {sendResults.filter((r) => r.ok).length}件 / 失敗{" "}
          {sendResults.filter((r) => !r.ok).length}件
        </p>
      )}
    </section>
  );
}
