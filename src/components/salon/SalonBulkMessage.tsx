"use client";

import { useEffect, useMemo, useState } from "react";

import { SALON_MESSAGE_SCENES, salonMessageSceneLabel } from "@/lib/salon/salon-message-scenes";

interface SalonCustomer {
  userId: string;
  displayName: string;
  achievementRate: number;
}

interface Template {
  id: string;
  scene: string;
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

const SCENE_FILTER_ALL = "all";

export function SalonBulkMessage({ customers, apiBasePath = "/api/salon" }: SalonBulkMessageProps) {
  const [templates, setTemplates] = useState<Template[] | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [sceneFilter, setSceneFilter] = useState<string>(SCENE_FILTER_ALL);

  const [templateFormOpen, setTemplateFormOpen] = useState(false);
  const [newScene, setNewScene] = useState<string>(SALON_MESSAGE_SCENES[0].value);
  const [newTitle, setNewTitle] = useState("");
  const [newBody, setNewBody] = useState("");
  const [creatingTemplate, setCreatingTemplate] = useState(false);

  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [messageText, setMessageText] = useState("");
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

  const visibleTemplates = useMemo(() => {
    if (!templates) return [];
    if (sceneFilter === SCENE_FILTER_ALL) return templates;
    return templates.filter((t) => t.scene === sceneFilter);
  }, [templates, sceneFilter]);

  function toggleCustomer(userId: string) {
    setSelectedCustomerIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId],
    );
  }

  function applyTemplate(template: Template) {
    setSelectedTemplateId(template.id);
    setMessageText(template.body);
  }

  async function createTemplate() {
    setCreatingTemplate(true);
    const res = await fetch(`${apiBasePath}/templates`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ scene: newScene, title: newTitle, body: newBody }),
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
    if (selectedTemplateId === id) {
      setSelectedTemplateId(null);
    }
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
        text: messageText,
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

  const canSend = selectedCustomerIds.length > 0 && messageText.trim().length > 0;

  return (
    <section className="rounded-2xl border border-salon-border bg-salon-gold-soft/60 p-6 shadow-sm shadow-salon-gold/10">
      <h2 className="font-salon-display mb-3 text-xl font-semibold text-salon-heading">
        📨 テンプレート一斉送信
      </h2>

      <div className="mb-4">
        <div className="mb-2 flex items-center justify-between gap-2">
          <p className="text-xs font-medium text-salon-muted">利用シーンで選ぶ</p>
          <button
            onClick={() => setTemplateFormOpen((v) => !v)}
            className="rounded-full border border-salon-gold px-3 py-1 text-xs text-salon-gold-strong hover:bg-salon-gold-soft"
          >
            + 新規作成
          </button>
        </div>

        <div className="mb-3 flex flex-wrap gap-1.5">
          <button
            onClick={() => setSceneFilter(SCENE_FILTER_ALL)}
            className={
              sceneFilter === SCENE_FILTER_ALL
                ? "rounded-full bg-salon-gold-strong px-3 py-1 text-xs text-salon-on-strong"
                : "rounded-full border border-salon-border px-3 py-1 text-xs text-salon-ink hover:bg-salon-gold-soft"
            }
          >
            すべて
          </button>
          {SALON_MESSAGE_SCENES.map((s) => (
            <button
              key={s.value}
              onClick={() => setSceneFilter(s.value)}
              className={
                sceneFilter === s.value
                  ? "rounded-full bg-salon-gold-strong px-3 py-1 text-xs text-salon-on-strong"
                  : "rounded-full border border-salon-border px-3 py-1 text-xs text-salon-ink hover:bg-salon-gold-soft"
              }
            >
              {s.label}
            </button>
          ))}
        </div>

        {templateFormOpen && (
          <div className="mb-3 flex flex-col gap-2 rounded-xl bg-salon-surface p-3">
            <label className="flex flex-col gap-1 text-xs font-medium text-salon-muted">
              利用シーン
              <select
                value={newScene}
                onChange={(e) => setNewScene(e.target.value)}
                className="rounded-md border border-salon-border px-3 py-1.5 text-sm font-normal text-salon-ink"
              >
                {SALON_MESSAGE_SCENES.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </label>
            <input
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="テンプレート名(例:来月キャンペーン案内)"
              className="rounded-md border border-salon-border px-3 py-1.5 text-sm text-salon-ink"
            />
            <textarea
              value={newBody}
              onChange={(e) => setNewBody(e.target.value)}
              rows={3}
              maxLength={1000}
              placeholder="本文"
              className="rounded-md border border-salon-border px-3 py-1.5 text-sm text-salon-ink"
            />
            <div className="flex gap-2">
              <button
                onClick={createTemplate}
                disabled={creatingTemplate || !newTitle.trim() || !newBody.trim()}
                className="rounded-full bg-salon-gold-strong px-4 py-1.5 text-xs text-salon-on-strong hover:bg-salon-gold-hover disabled:opacity-50"
              >
                保存
              </button>
              <button
                onClick={() => setTemplateFormOpen(false)}
                className="rounded-full border border-salon-border px-4 py-1.5 text-xs text-salon-ink hover:bg-salon-gold-soft"
              >
                キャンセル
              </button>
            </div>
          </div>
        )}

        <ul className="flex flex-col gap-1">
          {visibleTemplates.map((t) => (
            <li
              key={t.id}
              className={
                selectedTemplateId === t.id
                  ? "flex items-center justify-between rounded-xl border-2 border-salon-gold bg-salon-surface px-3 py-2"
                  : "flex items-center justify-between rounded-xl border border-transparent bg-salon-surface px-3 py-2"
              }
            >
              <button onClick={() => applyTemplate(t)} className="flex-1 text-left">
                <span className="mb-0.5 inline-block rounded-full bg-salon-gold-soft px-2 py-0.5 text-[10px] text-salon-gold-strong">
                  {salonMessageSceneLabel(t.scene)}
                </span>
                <span className="block text-sm font-medium text-salon-heading">{t.title}</span>
                <span className="block truncate text-xs text-salon-muted">{t.body}</span>
              </button>
              <button
                onClick={() => deleteTemplate(t.id)}
                className="ml-2 text-xs text-red-500 hover:text-red-600"
              >
                削除
              </button>
            </li>
          ))}
          {templates && visibleTemplates.length === 0 && !templateFormOpen && (
            <p className="text-xs text-salon-muted">このシーンのテンプレートはまだありません。</p>
          )}
        </ul>
      </div>

      <label className="mb-4 flex flex-col gap-1 text-xs font-medium text-salon-muted">
        送信する本文(テンプレートを選ぶと自動入力されます。自由に編集できます)
        <textarea
          value={messageText}
          onChange={(e) => {
            setMessageText(e.target.value);
            setSelectedTemplateId(null);
          }}
          rows={4}
          maxLength={1000}
          placeholder="テンプレートを選ぶか、直接入力してください"
          className="rounded-md border border-salon-border bg-salon-surface px-3 py-1.5 text-sm font-normal text-salon-ink"
        />
      </label>

      <p className="mb-2 text-xs font-medium text-salon-muted">送信先の顧客を選択</p>
      <ul className="mb-4 flex max-h-56 flex-col gap-1 overflow-y-auto rounded-xl bg-salon-surface p-2">
        {customers.map((c) => (
          <li key={c.userId}>
            <label className="flex cursor-pointer items-center gap-2 rounded px-2 py-1 text-sm text-salon-ink hover:bg-salon-gold-soft">
              <input
                type="checkbox"
                checked={selectedCustomerIds.includes(c.userId)}
                onChange={() => toggleCustomer(c.userId)}
              />
              {c.displayName}
            </label>
          </li>
        ))}
        {customers.length === 0 && (
          <p className="px-2 py-1 text-xs text-salon-muted">顧客がまだいません。</p>
        )}
      </ul>

      <button
        onClick={sendBulk}
        disabled={!canSend || sending}
        className="rounded-full bg-salon-gold-strong px-5 py-2 text-sm text-salon-on-strong hover:bg-salon-gold-hover disabled:opacity-50"
      >
        {sending ? "送信中..." : `選択した${selectedCustomerIds.length}名に送信`}
      </button>

      {sendError && <p className="mt-3 text-sm text-red-600 dark:text-red-400">{sendError}</p>}
      {sendResults && (
        <p className="mt-3 text-sm text-salon-ink">
          送信完了:成功 {sendResults.filter((r) => r.ok).length}件 / 失敗{" "}
          {sendResults.filter((r) => !r.ok).length}件
        </p>
      )}
    </section>
  );
}
