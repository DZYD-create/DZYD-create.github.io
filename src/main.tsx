import React, { useEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { createRoot } from "react-dom/client";
import "./styles.css";
import "./overrides.css";
import "./history-panel.css";
import "./editor-figma.css";
import "./final-overrides.css";

type Section = "studio" | "canvas" | "history" | "assets";
type ThemeMode = "system" | "dark" | "light";
type EditorTool = "局部重绘" | "擦除内容" | "图片尺寸" | "增强清晰度";
type CanvasNode = {
  id: number;
  url: string;
  x: number;
  y: number;
  name: string;
  placeholder?: boolean;
  mediaWidth?: number;
  mediaHeight?: number;
  generated?: boolean;
  generationPrompt?: string;
};
type eastWest = "left" | "right";
type CanvasLink = {
  id: number;
  from: number;
  side: "left" | "right";
  to: number;
  targetSide: "left" | "right";
  endX?: any;
  endY?: any;
};

const nav: { id: Section; label: string; icon: string }[] = [
  { id: "studio", label: "工作台", icon: "/assets/nav-studio.svg" },
  { id: "canvas", label: "画布", icon: "/assets/nav-canvas.svg" },
  { id: "history", label: "历史", icon: "/assets/nav-history.svg" },
  { id: "assets", label: "素材库", icon: "/assets/nav-assets.svg" },
];

const samples = [
  "/assets/template-1.png",
  "/assets/template-2.png",
  "/assets/template-3.png",
  "/assets/template-4.png",
  "/assets/template-5.png",
  "/assets/template-6.png",
];

function App() {
  const [section, setSection] = useState<Section>("studio");
  const [prompt, setPrompt] = useState("");
  const [skill, setSkill] = useState("预热海报");
  const [generating, setGenerating] = useState(false);
  const [preparing, setPreparing] = useState(false);
  const [generated, setGenerated] = useState(false);
  const [studioView, setStudioView] = useState<
    "home" | "new" | "generation" | "detail"
  >("home");
  const [selectedTemplate, setSelectedTemplate] = useState(0);
  const [templateDetailOpen, setTemplateDetailOpen] = useState(false);
  const [selectedTemplateModel, setSelectedTemplateModel] =
    useState("图片 4.5");
  const [selectedTemplateRatio, setSelectedTemplateRatio] = useState("3:4");
  const [conversationCollapsed, setConversationCollapsed] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editorReturn, setEditorReturn] = useState<"studio" | "history">("studio");
  const [tool, setTool] = useState<EditorTool | null>(null);
  const [canvasImage, setCanvasImage] = useState<string | null>(null);
  const [canvasImageName, setCanvasImageName] = useState("AI 视觉创作 · 未命名项目");
  const [pendingCanvasAssets, setPendingCanvasAssets] = useState<Array<{ name: string; url: string }>>([]);
  const [folders, setFolders] = useState(["品牌素材", "产品图片"]);
  const [accountOpen, setAccountOpen] = useState(false);
  const [themeOpen, setThemeOpen] = useState(false);
  const [themeMode, setThemeMode] = useState<ThemeMode>(() => (localStorage.getItem("studio-theme") as ThemeMode) || "light");
  const [systemDark, setSystemDark] = useState(() => window.matchMedia("(prefers-color-scheme: dark)").matches);
  const [conversations, setConversations] = useState<Array<[string, string]>>([
    ["夏日新品直播海报", "今天 14:32"],
    ["课程价格板设计", "昨天 18:10"],
    ["新品种草海报", "08月02日"],
    ["品牌活动视觉方案", "07月29日"],
    ["门店促销物料", "07月21日"],
  ]);
  const [activeConversation, setActiveConversation] = useState<string | null>(null);
  const generationTimer = useRef<number | null>(null);
  const preparationTimer = useRef<number | null>(null);

  const generate = () => {
    if (generationTimer.current) window.clearTimeout(generationTimer.current);
    if (preparationTimer.current) window.clearTimeout(preparationTimer.current);
    const nextPrompt = prompt.trim() || "夏日新品预热海报，清爽明亮的蓝色视觉";
    if (!prompt.trim()) setPrompt(nextPrompt);
    const title = nextPrompt.length > 18 ? `${nextPrompt.slice(0, 18)}…` : nextPrompt;
    setActiveConversation(title);
    setConversations((items) =>
      items.some(([name]) => name === title)
        ? items
        : [[title, "刚刚"], ...items],
    );
    setStudioView("generation");
    setPreparing(true);
    setGenerating(false);
    setGenerated(false);
    preparationTimer.current = window.setTimeout(() => {
      setPreparing(false);
      setGenerating(true);
      preparationTimer.current = null;
      generationTimer.current = window.setTimeout(() => {
        setGenerating(false);
        setGenerated(true);
        generationTimer.current = null;
      }, 3200);
    }, 2600);
  };

  const newCreation = () => {
    if (generationTimer.current) window.clearTimeout(generationTimer.current);
    if (preparationTimer.current) window.clearTimeout(preparationTimer.current);
    generationTimer.current = null;
    preparationTimer.current = null;
    setSection("studio");
    setPrompt("");
    setSkill("预热海报");
    setGenerating(false);
    setPreparing(false);
    setGenerated(false);
    setStudioView("new");
    setConversationCollapsed(false);
    setEditing(false);
    setTool(null);
    setActiveConversation(null);
  };

  useEffect(() => {
    const dismiss = () => { setAccountOpen(false); setThemeOpen(false); };
    document.addEventListener("dismiss-popovers", dismiss);
    return () => {
      document.removeEventListener("dismiss-popovers", dismiss);
      if (generationTimer.current) window.clearTimeout(generationTimer.current);
      if (preparationTimer.current)
        window.clearTimeout(preparationTimer.current);
    };
  }, []);

  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const update = () => setSystemDark(media.matches);
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    localStorage.setItem("studio-theme", themeMode);
  }, [themeMode]);

  const upload = (file?: File) => {
    if (!file) return;
    const url = URL.createObjectURL(file);
    setCanvasImage(url);
  };

  const isCanvas = section === "canvas";
  const darkTheme = themeMode === "dark" || (themeMode === "system" && systemDark);
  return (
    <div
      className={`app-shell ${isCanvas ? "canvas-shell" : ""} ${darkTheme ? "theme-dark" : "theme-light"}`}
      onKeyDownCapture={(event) => {
        if (
          event.key !== "Enter" ||
          event.shiftKey ||
          event.nativeEvent.isComposing
        )
          return;
        const target = event.target as HTMLElement;
        if (!target.matches("input,textarea,[contenteditable='true']")) return;
        const scope = target.closest(
          ".composer,.generation-composer,.canvas-node-prompt,.canvas-comment-panel,.canvas-comment-reply,.folder-create,.apply-popover,.figma-tool-modal,.edit-prompt-block",
        );
        if (!scope) return;
        const action = scope.querySelector<HTMLButtonElement>(
          ".generate,.new-generate,.canvas-node-prompt-send,.canvas-comment-panel footer button,.canvas-comment-reply button,.folder-create button,.apply-canvas,.modal-generate,.save-edit,button[type='submit']",
        );
        if (!action || action.disabled) return;
        event.preventDefault();
        action.click();
      }}
      onPointerDownCapture={(e) => {
        const target = e.target as HTMLElement;
        if (
          !target.closest(
            "[data-popover-trigger],.theme-picker,.popover,.model-selector-popover,.size-selector-popover,.model-invocation-popover,.canvas-add-popover,.asset-library-panel,.home-asset-popover,.asset-add-menu,.asset-folder-menu,.asset-context-menu,.apply-popover,.figma-history-panel,.canvas-search-modal,.canvas-comment-panel,.canvas-comments-mode,.figma-tool-modal",
          )
        )
          document.dispatchEvent(new Event("dismiss-popovers"));
      }}
    >
      {!isCanvas && (
        <header className="topbar">
          <div className="brand">
            <span className="brand-mark">
              <img src="/assets/brand-logo.svg" />
            </span>
            <strong>点阵跃动</strong>
            <small>BETA</small>
          </div>
          <div className="account">
            <span className="credits">
              <img src="/assets/credit.svg" /> 300 积分
            </span>
            <button
              data-popover-trigger
              className="account-trigger"
              onClick={() => setAccountOpen((v) => !v)}
              aria-expanded={accountOpen}
            >
              <span className="avatar">
                <img src="/assets/user-avatar.svg" />
              </span>
              <img
                className="account-dropdown"
                src="/assets/account-dropdown.svg"
              />
            </button>
            {accountOpen && (
              <div className="account-popover">
                <i />
                <button>
                  <span className="account-option-icon">↻</span>
                  <b>切换账号</b>
                  <span className="account-check">✓</span>
                </button>
                <button>
                  <span className="account-option-icon account-logout">↪</span>
                  <b>退出登录</b>
                </button>
              </div>
            )}
          </div>
        </header>
      )}
      {!isCanvas && (
        <aside className="rail">
          <div className="rail-items">
            {nav.map((item) => (
              <button
                key={item.id}
                className={
                  section === item.id &&
                  (item.id !== "studio" || studioView !== "generation")
                    ? "active"
                    : ""
                }
                onClick={() => {
                  setSection(item.id);
                  setEditing(false);
                  if (item.id === "studio") setStudioView("home");
                }}
              >
                <span className={`nav-glyph nav-glyph-${item.id}`}>
                  <img src={item.icon} />
                  <span className="nav-motion" aria-hidden="true">
                    <i />
                    <i />
                    <i />
                  </span>
                </span>
                <span>{item.label}</span>
              </button>
            ))}
          </div>
          <button data-popover-trigger className="theme" aria-label="主题设置" aria-expanded={themeOpen} onClick={() => setThemeOpen((value) => !value)}>
            <img src="/assets/theme.svg" />
          </button>
          {themeOpen && (
            <div className="theme-picker" role="menu" aria-label="选择网站主题">
              {([['system','跟随系统','/assets/theme-system.svg'],['dark','深色主题','/assets/theme-moon.svg'],['light','浅色主题','/assets/theme-sun.svg']] as const).map(([value,label,icon]) => (
                <button key={value} role="menuitemradio" aria-checked={themeMode===value} className={themeMode===value ? "active" : ""} onClick={() => { setThemeMode(value); setThemeOpen(false); }}>
                  <img src={icon} alt="" /><span>{label}</span>{themeMode===value ? <img className="theme-check" src="/assets/theme-check.svg" alt="已选择" /> : <i />}
                </button>
              ))}
            </div>
          )}
        </aside>
      )}
      {section === "studio" &&
        !editing &&
        !conversationCollapsed &&
        studioView !== "detail" && (
          <StudioSidebar
            conversations={conversations}
            activeConversation={activeConversation}
            onRename={(previous, next) => {
              setConversations((items) =>
                items.map(([title, time]) => [title === previous ? next : title, time]),
              );
              if (activeConversation === previous) setActiveConversation(next);
              if (prompt === previous) setPrompt(next);
            }}
            onNewWork={newCreation}
            onClear={() => {
              setConversations([]);
              setActiveConversation(null);
              newCreation();
            }}
            onOpenConversation={(title) => {
              setPrompt(title);
              setActiveConversation(title);
              setStudioView("generation");
              setPreparing(false);
              setGenerating(false);
              setGenerated(true);
            }}
          />
        )}
      <main
        className={`main ${section === "studio" && !editing && !conversationCollapsed && studioView !== "detail" ? "with-panel" : ""} ${isCanvas ? "canvas-main" : ""}`}
      >
        {section === "studio" && !editing && studioView === "home" && (
          <Studio
            skill={skill}
            setSkill={setSkill}
            prompt={prompt}
            setPrompt={setPrompt}
            generate={generate}
            generating={false}
            generated={false}
            onEdit={() => {
              setEditorReturn("studio");
              setEditing(true);
            }}
            onTemplate={(index) => {
              setSelectedTemplate(index);
              setTemplateDetailOpen(true);
            }}
          />
        )}
        {section === "studio" &&
          !editing &&
          studioView === "home" &&
          templateDetailOpen && (
            <TemplateDetail
              index={selectedTemplate}
              onClose={() => setTemplateDetailOpen(false)}
              onUse={(text, model, ratio) => {
                setTemplateDetailOpen(false);
                setPrompt(text);
                setSelectedTemplateModel(model);
                setSelectedTemplateRatio(ratio);
                setSkill("预热海报");
                setPreparing(false);
                setGenerating(false);
                setGenerated(false);
                setStudioView("generation");
              }}
            />
          )}
        {section === "studio" && !editing && studioView === "new" && (
          <NewCreationPage
            prompt={prompt}
            setPrompt={setPrompt}
            generate={generate}
            onBack={() => setStudioView("home")}
          />
        )}
        {section === "studio" && !editing && studioView === "generation" && (
          <GenerationPage
            prompt={prompt}
            skill={skill}
            model={selectedTemplateModel}
            ratio={selectedTemplateRatio}
            preparing={preparing}
            generating={generating}
            generated={generated}
            collapsed={conversationCollapsed}
            onToggleCollapsed={() => setConversationCollapsed((v) => !v)}
            onBack={() => {
              setStudioView("home");
              setConversationCollapsed(false);
            }}
            onEdit={() => setEditing(true)}
            onRegenerate={(value) => {
              setPrompt(value);
              generate();
            }}
            onDeleteConversation={() => {
              if (activeConversation)
                setConversations((items) =>
                  items.filter(([title]) => title !== activeConversation),
                );
              newCreation();
            }}
          />
        )}
        {section === "studio" && editing && (
          <Editor
            tool={tool}
            setTool={setTool}
            prompt={prompt}
            onClose={() => {
              setEditing(false);
              if (editorReturn === "history") setSection("history");
            }}
            onCanvas={() => {
              setCanvasImage("/assets/template-2.png");
              setSection("canvas");
              setEditing(false);
            }}
          />
        )}
        {section === "canvas" && (
          <Canvas
            canvasImage={canvasImage}
            canvasImageName={canvasImageName}
            initialAssets={pendingCanvasAssets}
            setCanvasImage={setCanvasImage}
            folders={folders}
            setFolders={setFolders}
            upload={upload}
            onEdit={() => {
              setEditorReturn("studio");
              setSection("studio");
              setEditing(true);
            }}
            onBack={() => setSection("studio")}
          />
        )}
        {section === "history" && (
          <History
            onEdit={() => {
              setEditorReturn("history");
              setSection("studio");
              setEditing(true);
            }}
            onBack={() => {
              setSection("studio");
              setStudioView("home");
              setConversationCollapsed(false);
            }}
            onCanvas={(image, name) => {
              setSection("canvas");
              setPendingCanvasAssets([]);
              setCanvasImage(image || null);
              if (name) setCanvasImageName(name);
            }}
          />
        )}
        {section === "assets" && (
          <Assets
            folders={folders}
            setFolders={setFolders}
            onBack={() => {
              setSection("studio");
              setStudioView("home");
              setConversationCollapsed(false);
            }}
            onSendToCanvas={(item) => {
              const liveParts = [
                { name: "直播间下贴片", url: "/assets/live-lower-strip.png" },
                { name: "直播间上贴片背景", url: "/assets/live-upper-background.png" },
                { name: "冯梦飞姓名贴", url: "/assets/live-name-feng.png" },
                { name: "蝎子号姓名贴", url: "/assets/live-name-cohost.png" },
                { name: "直播间上贴片标题", url: "/assets/live-upper-title.png" },
              ];
              const assets = item.category === "live" ? liveParts : [{ name: item.name, url: item.url }];
              setPendingCanvasAssets(assets);
              // Keep the source asset name as the canvas project title. The
              // five live-room parts retain their own individual node names.
              setCanvasImageName(item.name);
              setCanvasImage(assets[0].url);
              setSection("canvas");
            }}
          />
        )}
      </main>
    </div>
  );
}

function GenerationPage({
  prompt,
  skill,
  model,
  ratio,
  preparing,
  generating,
  generated,
  collapsed,
  onToggleCollapsed,
  onBack,
  onEdit,
  onRegenerate,
  onDeleteConversation,
}: {
  prompt: string;
  skill: string;
  model: string;
  ratio: string;
  preparing: boolean;
  generating: boolean;
  generated: boolean;
  collapsed: boolean;
  onToggleCollapsed: () => void;
  onBack: () => void;
  onEdit: () => void;
  onRegenerate: (value: string) => void;
  onDeleteConversation: () => void;
}) {
  const [draft, setDraft] = useState(prompt);
  const [modelOpen, setModelOpen] = useState(false);
  const [sizeOpen, setSizeOpen] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [assetsOpen, setAssetsOpen] = useState(false);
  const [invocationOpen, setInvocationOpen] = useState(false);
  const generationFile = useRef<HTMLInputElement>(null);
  const composerInput = useRef<HTMLTextAreaElement>(null);
  const [progress, setProgress] = useState(generating ? 0 : 100);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteRound, setDeleteRound] = useState<number | null>(null);
  const [moreRound, setMoreRound] = useState<number | null>(null);
  const [deletedRounds, setDeletedRounds] = useState<number[]>([]);
  const [resultRound, setResultRound] = useState(0);
  const [roundPrompts, setRoundPrompts] = useState([
    prompt || "生成夏日新品直播海报，突出新品卖点，风格清爽明亮。",
  ]);
  const startNewRound = (request: string) => {
    const nextRequest = request.trim() || prompt;
    setRoundPrompts((items) => [...items, nextRequest]);
    setResultRound((round) => round + 1);
    onRegenerate(nextRequest);
  };
  useEffect(() => {
    setDraft(prompt);
  }, [prompt]);
  useEffect(() => {
    const dismiss = () => {
      setModelOpen(false);
      setSizeOpen(false);
      setUploadOpen(false);
      setAssetsOpen(false);
      setInvocationOpen(false);
    };
    document.addEventListener("dismiss-popovers", dismiss);
    return () => document.removeEventListener("dismiss-popovers", dismiss);
  }, []);
  useEffect(() => {
    if (!generating) {
      setProgress(100);
      return;
    }
    setProgress(0);
    const started = Date.now();
    const timer = window.setInterval(
      () => setProgress(Math.min(100, Math.round((Date.now() - started) / 32))),
      64,
    );
    return () => window.clearInterval(timer);
  }, [generating]);
  return (
    <section className="generation-page">
      <div className="generation-header">
        <button
          className="generation-back"
          onClick={onBack}
          aria-label="返回首页"
        >
          <img src="/assets/history-back.svg" />
        </button>
        <strong>与跃动的对话</strong>
        <button className="collapse-chat" onClick={onToggleCollapsed}>
          {collapsed ? "展开对话" : "收起对话"}
        </button>
      </div>
      <div
        className={`generation-thread ${!preparing && !generating && !generated ? "idle" : ""}`}
      >
        {Array.from({ length: resultRound + 1 }, (_, round) => {
          if (deletedRounds.includes(round)) return null;
          const latest = round === resultRound;
          const isPreparing = latest && preparing;
          const isGenerating = latest && generating;
          return (
            <div className="generation-round" key={round}>
              <div className="user-message-wrap">
                <div className="user-message">
                  <p>{roundPrompts[round]}</p>
                </div>
                <img src="/assets/user-avatar.svg" alt="用户" />
              </div>
              {!isPreparing && (
                <div className="assistant-message">
                  <img
                    src={isGenerating ? "/assets/dog-thinking-public.gif" : "/assets/dog-complete-public.gif"}
                    alt="跃动"
                  />
                  <span className="generation-status-copy" aria-live="polite">
                    <strong className={isGenerating ? "generating active" : "generating"}>
                      正在生成 4 张图片…
                    </strong>
                    <strong className={!isGenerating ? "completed active" : "completed"}>
                      已完成 4 张图片
                    </strong>
                  </span>
                </div>
              )}
              {isPreparing ? (
                <div className="visual-plan-message">
                  <img src="/assets/dog-thinking-public.gif" alt="思考中的跃动" />
                  <div className="ai-generating-bubble">
                    <strong>正在生成视觉方案…</strong>
                    <p>已接收 1 张图片，正在分析内容与版式</p>
                    <div className="ai-generating-progress"><span>✦</span><div><i /></div></div>
                  </div>
                </div>
              ) : (
                <div className={`generated-gallery ${isGenerating ? "loading" : ""}`}>
                  {[...samples, ...samples]
                    .slice(round % samples.length, round % samples.length + 4)
                    .map((src, i) => (
                      <button className="generation-tile" key={`${round}-${src}`} onClick={onEdit}>
                        {isGenerating ? (
                          <div className="generation-progress"><span>✦</span><strong>生成中 {progress}%</strong></div>
                        ) : (
                          <img src={src} alt={`第 ${round + 1} 轮生成结果 ${i + 1}`} />
                        )}
                      </button>
                    ))}
                </div>
              )}
              {(!latest || (!preparing && !generating && generated)) && (
                <div className="generation-result-actions">
                  <button
                    className="action-edit"
                    onClick={() => {
                      setDraft(roundPrompts[round]);
                      window.setTimeout(() => composerInput.current?.focus(), 0);
                    }}
                  >
                    <img src="/assets/action-reedit-figma.svg" />重新编辑
                  </button>
                  <button className="action-regenerate" onClick={() => startNewRound(roundPrompts[round])}>
                    <img src="/assets/action-regenerate.svg" />再次生成
                  </button>
                  <div className="generation-more-wrap">
                    <button
                      className="action-more"
                      aria-label={`第 ${round + 1} 轮更多`}
                      aria-expanded={moreRound === round}
                      onClick={() => setMoreRound((current) => current === round ? null : round)}
                    >•••</button>
                    {moreRound === round && (
                      <div className="generation-more-menu" role="menu">
                        <button
                          className="batch-delete"
                          role="menuitem"
                          onClick={() => {
                            setMoreRound(null);
                            setDeleteRound(round);
                            setDeleteOpen(true);
                          }}
                        >
                          <img className="batch-delete-icon" src="/assets/action-trash.svg" alt="" />批量删除
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
      {deleteOpen && (
        <div className="generation-delete-backdrop" role="presentation">
          <section
            className="generation-delete-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-dialog-title"
          >
            <button
              className="generation-delete-close"
              aria-label="关闭"
              onClick={() => setDeleteOpen(false)}
            >
              ×
            </button>
            <h2 id="delete-dialog-title">确认删除</h2>
            <p>该轮请求与生成图片删除后将无法找回</p>
            <footer>
              <button className="generation-delete-cancel" onClick={() => setDeleteOpen(false)}>
                取消
              </button>
              <button className="generation-delete-confirm" onClick={() => {
                if (deleteRound !== null && !deletedRounds.includes(deleteRound)) {
                  const remainingRounds = resultRound + 1 - deletedRounds.length;
                  if (remainingRounds <= 1) {
                    setDeleteOpen(false);
                    setDeleteRound(null);
                    onDeleteConversation();
                    return;
                  }
                  setDeletedRounds((items) => [...items, deleteRound]);
                }
                setDeleteOpen(false);
                setDeleteRound(null);
              }}>
                删除
              </button>
            </footer>
          </section>
        </div>
      )}
      <div className="composer figma-composer generation-composer new-creation-composer">
        <textarea
          ref={composerInput}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="描述你的设计需求，输入 @ 可引用素材或 Skill"
        />
        <footer className="composer-actions">
          <button
            data-popover-trigger
            className="new-upload home-upload-trigger"
            aria-expanded={uploadOpen}
            onClick={() => {
              setUploadOpen((v) => !v);
              setModelOpen(false);
              setSizeOpen(false);
              setAssetsOpen(false);
            }}
          >
            <img src="/assets/figma-paperclip.svg" />
          </button>
          <button
            data-popover-trigger
            className="home-model-trigger"
            aria-expanded={modelOpen}
            title={`当前模型：${model}`}
            onClick={() => {
              setModelOpen((v) => !v);
              setUploadOpen(false);
              setSizeOpen(false);
              setAssetsOpen(false);
            }}
          >
            <img src="/assets/figma-home-model.svg" />
            模型选择
          </button>
          <button
            data-popover-trigger
            className="home-size-trigger"
            aria-expanded={sizeOpen}
            title={`当前尺寸：${ratio}`}
            onClick={() => {
              setSizeOpen((v) => !v);
              setUploadOpen(false);
              setModelOpen(false);
              setAssetsOpen(false);
            }}
          >
            <img src="/assets/figma-home-size.svg" />
            尺寸选择
          </button>
          <button
            data-popover-trigger
            className="home-assets-trigger"
            aria-expanded={assetsOpen}
            onClick={() => {
              setAssetsOpen((v) => !v);
              setUploadOpen(false);
              setModelOpen(false);
              setSizeOpen(false);
            }}
          >
            <img src="/assets/figma-home-assets.svg" />
            资产库
          </button>
          <i />
          <button
            data-popover-trigger
            className="new-model invocation-trigger"
            aria-label="大模型调用"
            aria-expanded={invocationOpen}
            onClick={() => {
              setInvocationOpen((value) => !value);
              setUploadOpen(false);
              setModelOpen(false);
              setSizeOpen(false);
              setAssetsOpen(false);
            }}
          ><img src="/assets/figma-invocation-chip.svg" alt="" /></button>
          <button className="new-generate" onClick={() => startNewRound(draft)}>
            {preparing || generating ? "生成中…" : "立即生成"}
          </button>
        </footer>
        {uploadOpen && (
          <div className="popover upload-pop new-upload-pop">
            <button onClick={() => generationFile.current?.click()}>
              <img src="/assets/upload-document.svg" /> 上传文档
            </button>
            <button onClick={() => generationFile.current?.click()}>
              <FigmaUploadImageIcon /> 上传图片
            </button>
          </div>
        )}
        {modelOpen && <ModelPopover onClose={() => setModelOpen(false)} />}{" "}
        {sizeOpen && <SizePopover onClose={() => setSizeOpen(false)} />}{" "}
        {assetsOpen && (
          <HomeAssetPopover
            onChoose={() => {
              setAssetsOpen(false);
              generationFile.current?.click();
            }}
          />
        )}
        {invocationOpen && <ModelInvocationPopover />}
        <input
          ref={generationFile}
          hidden
          type="file"
          accept="image/*,.pdf,.doc,.docx"
          onChange={() => setUploadOpen(false)}
        />
      </div>
    </section>
  );
}

function summarizeConversationTitle(title: string) {
  const cleaned = title.replace(/\s+/g, " ").trim().replace(/[。！？!?，,；;：:…]+$/g, "");
  for (let size = 2; size <= Math.min(14, Math.floor(cleaned.length / 2)); size += 1) {
    const phrase = cleaned.slice(0, size);
    if (cleaned.startsWith(phrase + phrase)) return phrase;
  }
  return cleaned.length > 14 ? `${cleaned.slice(0, 13)}…` : cleaned;
}

function StudioSidebar({
  conversations,
  activeConversation,
  onRename,
  onNewWork,
  onClear,
  onOpenConversation,
}: {
  conversations: Array<[string, string]>;
  activeConversation: string | null;
  onRename: (previous: string, next: string) => void;
  onNewWork: () => void;
  onClear: () => void;
  onOpenConversation: (title: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [renaming, setRenaming] = useState<string | null>(null);
  const [renameDraft, setRenameDraft] = useState("");
  const [clearOpen, setClearOpen] = useState(false);
  const renameOriginal = useRef("");
  const renamePrevious = useRef("");
  const visible = conversations.filter(([title]) =>
    title.toLowerCase().includes(query.trim().toLowerCase()),
  );
  return (
    <aside className="conversation-panel">
      <button className="new-work" onClick={onNewWork}>
        <span className="new-work-main"><img src="/assets/figma-new-work-left.svg" alt="" /><b>新建创作</b></span>
        <img className="new-work-stars" src="/assets/figma-new-work-right.svg" alt="" />
      </button>
      <label className="search conversation-search">
        <img src="/assets/search.svg" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="搜索"
        />
      </label>
      <p className="muted label">过往对话</p>
      <div className="conversation-history-scroll">
        {visible.map(([a, b]) => (
          <button
            className={`history-row ${activeConversation === a ? "active" : ""}`}
            onClick={() => onOpenConversation(a)}
            onDoubleClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              renameOriginal.current = a;
              renamePrevious.current = a;
              setRenameDraft(a);
              setRenaming(a);
            }}
            key={a}
          >
            <strong title={a}>{summarizeConversationTitle(a)}</strong><small>{b}</small>
          </button>
        ))}
      </div>
      <div className="panel-footer">
        <button onClick={() => setClearOpen(true)}>清空记录</button>
        <button>设置</button>
      </div>
      {clearOpen && (
        <div className="conversation-clear-backdrop" role="presentation">
          <section className="conversation-clear-dialog" role="dialog" aria-modal="true" aria-labelledby="clear-conversation-title">
            <button className="conversation-clear-close" aria-label="关闭" onClick={() => setClearOpen(false)}>×</button>
            <h2 id="clear-conversation-title">确认清空记录</h2>
            <p>清空后，侧边栏中的全部过往对话将无法找回。</p>
            <footer>
              <button className="cancel" onClick={() => setClearOpen(false)}>取消</button>
              <button className="confirm" onClick={() => { setClearOpen(false); onClear(); }}>确认清空</button>
            </footer>
          </section>
        </div>
      )}
      {renaming && (
        <div className="conversation-rename-backdrop" onClick={(event) => event.stopPropagation()}>
          <section className="conversation-rename-dialog" role="dialog" aria-modal="true" aria-labelledby="rename-title">
            <button className="conversation-rename-close" aria-label="关闭" onClick={() => setRenaming(null)}>×</button>
            <h2 id="rename-title">重命名聊天</h2>
            <p>保持简短且易于识别</p>
            <input
              autoFocus
              maxLength={40}
              value={renameDraft}
              onChange={(event) => {
                const next = event.target.value;
                setRenameDraft(next);
                if (next.trim()) {
                  onRename(renamePrevious.current, next);
                  renamePrevious.current = next;
                }
              }}
            />
            <small>{renameDraft.length}/40</small>
            <footer>
              <button onClick={() => {
                onRename(renamePrevious.current, renameOriginal.current);
                setRenaming(null);
              }}>取消</button>
              <button className="save" disabled={!renameDraft.trim()} onClick={() => setRenaming(null)}>保存</button>
            </footer>
          </section>
        </div>
      )}
    </aside>
  );
}

function NewCreationPage({
  prompt,
  setPrompt,
  generate,
  onBack,
}: {
  prompt: string;
  setPrompt: (value: string) => void;
  generate: () => void;
  onBack: () => void;
}) {
  const [uploadOpen, setUploadOpen] = useState(false);
  const [modelOpen, setModelOpen] = useState(false);
  const [sizeOpen, setSizeOpen] = useState(false);
  const [assetsOpen, setAssetsOpen] = useState(false);
  const [invocationOpen, setInvocationOpen] = useState(false);
  const [greetingLook, setGreetingLook] = useState({ x: 0, y: 0 });
  const fileRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    const dismiss = () => {
      setUploadOpen(false);
      setModelOpen(false);
      setSizeOpen(false);
      setAssetsOpen(false);
      setInvocationOpen(false);
    };
    document.addEventListener("dismiss-popovers", dismiss);
    return () => document.removeEventListener("dismiss-popovers", dismiss);
  }, []);
  return (
    <section
      className="new-creation-page"
      onPointerMove={(event) => {
        const rect = event.currentTarget.getBoundingClientRect();
        setGreetingLook({
          x: Math.max(-1, Math.min(1, (event.clientX - rect.left) / rect.width * 2 - 1)),
          y: Math.max(-1, Math.min(1, (event.clientY - rect.top) / rect.height * 2 - 1)),
        });
      }}
      onPointerLeave={() => setGreetingLook({ x: 0, y: 0 })}
    >
      <header className="new-creation-header">
        <button onClick={onBack} aria-label="返回首页">
          <img src="/assets/history-back.svg" />
        </button>
        <strong>与跃动的对话</strong>
        <button>收起对话</button>
      </header>
      <div className="new-creation-intro">
        <span
          className="greeting-look-stage"
          style={{ "--look-x": greetingLook.x, "--look-y": greetingLook.y } as React.CSSProperties}
        >
          <img className="greeting-playing" src="/assets/group-48-character.png" alt="视线跟随鼠标的小狗" />
        </span>
        <p>你好，我是你的 AI 设计助手</p>
        <h1>
          今天想聊点什么<span>✦</span>
        </h1>
      </div>
      <div className="new-creation-composer">
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="描述你的设计需求，输入 @ 可引用素材或 Skill"
        />
        <footer>
          <button
            data-popover-trigger
            className="new-upload home-upload-trigger"
            aria-expanded={uploadOpen}
            onClick={() => {
              setUploadOpen((v) => !v);
              setModelOpen(false);
              setSizeOpen(false);
              setAssetsOpen(false);
            }}
          >
            <img src="/assets/figma-paperclip.svg" />
          </button>
          <button
            data-popover-trigger
            className="home-model-trigger"
            aria-expanded={modelOpen}
            onClick={() => {
              setModelOpen((v) => !v);
              setUploadOpen(false);
              setSizeOpen(false);
              setAssetsOpen(false);
            }}
          >
            <img src="/assets/figma-home-model.svg" />
            模型选择
          </button>
          <button
            data-popover-trigger
            className="home-size-trigger"
            aria-expanded={sizeOpen}
            onClick={() => {
              setSizeOpen((v) => !v);
              setUploadOpen(false);
              setModelOpen(false);
              setAssetsOpen(false);
            }}
          >
            <img src="/assets/figma-home-size.svg" />
            尺寸选择
          </button>
          <button
            data-popover-trigger
            className="home-assets-trigger"
            aria-expanded={assetsOpen}
            onClick={() => {
              setAssetsOpen((v) => !v);
              setUploadOpen(false);
              setModelOpen(false);
              setSizeOpen(false);
            }}
          >
            <img src="/assets/figma-home-assets.svg" />
            资产库
          </button>
          <i />
          <button
            data-popover-trigger
            className="new-model invocation-trigger"
            aria-label="大模型调用"
            aria-expanded={invocationOpen}
            onClick={() => {
              setInvocationOpen((value) => !value);
              setUploadOpen(false);
              setModelOpen(false);
              setSizeOpen(false);
              setAssetsOpen(false);
            }}
          ><img src="/assets/figma-invocation-chip.svg" alt="" /></button>
          <button className="new-generate" onClick={generate}>
            立即生成
          </button>
        </footer>
        {uploadOpen && (
          <div className="popover upload-pop new-upload-pop">
            <button onClick={() => fileRef.current?.click()}>
              <img src="/assets/upload-document.svg" /> 上传文档
            </button>
            <button onClick={() => fileRef.current?.click()}>
              <FigmaUploadImageIcon /> 上传图片
            </button>
          </div>
        )}
        {modelOpen && <ModelPopover onClose={() => setModelOpen(false)} />}{" "}
        {sizeOpen && <SizePopover onClose={() => setSizeOpen(false)} />}{" "}
        {assetsOpen && (
          <HomeAssetPopover
            onChoose={() => {
              setAssetsOpen(false);
              fileRef.current?.click();
            }}
          />
        )}
        {invocationOpen && <ModelInvocationPopover />}
        <input
          ref={fileRef}
          hidden
          type="file"
          accept="image/*,.pdf,.doc,.docx"
          onChange={() => setUploadOpen(false)}
        />
      </div>
    </section>
  );
}

function Studio({
  skill,
  setSkill,
  prompt,
  setPrompt,
  generate,
  generating,
  generated,
  onEdit,
  onTemplate,
}: {
  skill: string;
  setSkill: (v: string) => void;
  prompt: string;
  setPrompt: (v: string) => void;
  generate: () => void;
  generating: boolean;
  generated: boolean;
  onEdit: () => void;
  onTemplate: (index: number) => void;
}) {
  const skills = ["预热海报", "横/竖kt板", "小红书海报", "PPT优化", "更多类型"];
  const [uploadOpen, setUploadOpen] = useState(false);
  const [modelOpen, setModelOpen] = useState(false);
  const [sizeOpen, setSizeOpen] = useState(false);
  const [assetsOpen, setAssetsOpen] = useState(false);
  const [invocationOpen, setInvocationOpen] = useState(false);
  const [attachment, setAttachment] = useState("");
  const studioFile = useRef<HTMLInputElement>(null);
  useEffect(() => {
    const dismiss = () => {
      setUploadOpen(false);
      setModelOpen(false);
      setSizeOpen(false);
      setAssetsOpen(false);
      setInvocationOpen(false);
    };
    document.addEventListener("dismiss-popovers", dismiss);
    return () => document.removeEventListener("dismiss-popovers", dismiss);
  }, []);
  return (
    <section className="studio-page">
      <div className="assistant-orb">
        <img src="/assets/dog-pointing-stars-public.gif" alt="AI 设计助手" />
      </div>
      <p className="assistant-copy">你好，我是你的 AI 设计助手</p>
      <h1>从一句话开始，生成你的视觉作品</h1>
      <div className="skill-row">
        {skills.map((v, i) => (
          <button
            className={skill === v ? "selected" : ""}
            onClick={() => setSkill(v)}
            key={v}
          >
            <img
              src={`/assets/${["figma-skill-warm.svg", "figma-skill-kt.svg", "figma-skill-redbook.svg", "figma-skill-ppt.svg", "figma-skill-more.svg"][i]}`}
            />
            {v}
          </button>
        ))}
      </div>
      <div className="composer figma-composer">
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="描述你的设计需求，输入 @ 可引用素材或 Skill"
        />
        {attachment && (
          <div className="attachment">
            <img src="/assets/upload.svg" /> {attachment}
            <button
              className="css-close"
              aria-label="移除附件"
              onClick={() => setAttachment("")}
            />
          </div>
        )}
        <div className="composer-actions">
          <button
            data-popover-trigger
            className="icon-button home-upload-trigger"
            aria-expanded={uploadOpen}
            onClick={() => {
              setUploadOpen(!uploadOpen);
              setModelOpen(false);
              setSizeOpen(false);
              setAssetsOpen(false);
              setInvocationOpen(false);
            }}
            aria-label="添加内容"
          >
            <img src="/assets/figma-paperclip.svg" />
          </button>
          <button
            data-popover-trigger
            className="home-model-trigger"
            aria-expanded={modelOpen}
            onClick={() => {
              setModelOpen(!modelOpen);
              setUploadOpen(false);
              setSizeOpen(false);
              setAssetsOpen(false);
              setInvocationOpen(false);
            }}
          >
            <span className="home-model-icon">
              <img src="/assets/figma-home-model.svg" />
            </span>
            模型选择
          </button>
          <button
            data-popover-trigger
            className="home-size-trigger"
            aria-expanded={sizeOpen}
            onClick={() => {
              setSizeOpen(!sizeOpen);
              setUploadOpen(false);
              setModelOpen(false);
              setAssetsOpen(false);
              setInvocationOpen(false);
            }}
          >
            <img src="/assets/figma-home-size.svg" />
            尺寸选择
          </button>
          <button
            data-popover-trigger
            className="home-assets-trigger"
            aria-expanded={assetsOpen}
            onClick={() => {
              setAssetsOpen((v) => !v);
              setUploadOpen(false);
              setModelOpen(false);
              setSizeOpen(false);
              setInvocationOpen(false);
            }}
          >
            <img src="/assets/figma-home-assets.svg" />
            资产库
          </button>
          <i />{" "}
          <button
            data-popover-trigger
            className="model invocation-trigger"
            aria-label="大模型调用"
            aria-expanded={invocationOpen}
            onClick={() => {
              setInvocationOpen((v) => !v);
              setUploadOpen(false);
              setModelOpen(false);
              setSizeOpen(false);
              setAssetsOpen(false);
            }}
          >
            <img src="/assets/figma-invocation-chip.svg" alt="" />
          </button>
          <button className="generate" onClick={generate} disabled={generating}>
            {generating ? "生成中…" : "立即生成"}
          </button>
        </div>
        {uploadOpen && (
          <div className="popover upload-pop">
            <button onClick={() => studioFile.current?.click()}>
              <img src="/assets/upload-document.svg" /> 上传文档
            </button>
            <button onClick={() => studioFile.current?.click()}>
              <FigmaUploadImageIcon /> 上传图片
            </button>
          </div>
        )}
        {modelOpen && <ModelPopover onClose={() => setModelOpen(false)} />}
        {sizeOpen && <SizePopover onClose={() => setSizeOpen(false)} />}
        {assetsOpen && (
          <HomeAssetPopover
            onChoose={() => {
              setAssetsOpen(false);
              studioFile.current?.click();
            }}
          />
        )}
        {invocationOpen && <ModelInvocationPopover />}
        <input
          ref={studioFile}
          hidden
          type="file"
          accept="image/*,.pdf,.doc,.docx"
          onChange={(e) => {
            setAttachment(e.target.files?.[0]?.name || "");
            setUploadOpen(false);
          }}
        />
      </div>
      {!generated && !generating && <TemplateGallery onSelect={onTemplate} />}
      {generating && (
        <div className="generation-grid">
          {[1, 2, 3, 4].map((n) => (
            <div className="skeleton" key={n}>
              <img src="/assets/creation-ai.svg" />
              <p>正在生成视觉作品</p>
            </div>
          ))}
        </div>
      )}
      {generated && (
        <div className="results">
          <div className="result-heading">
            <strong>已生成 4 张图片</strong>
            <span>你可以继续调整或进入编辑</span>
          </div>
          <div className="generation-grid">
            {samples.slice(0, 4).map((src, i) => (
              <button className="result-card" onClick={onEdit} key={src}>
                <img src={src} />
                <span>编辑图片</span>
                <b>图 {i + 1}</b>
              </button>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

function ModelInvocationPopover() {
  const [level, setLevel] = useState("高");
  return (
    <div className="model-invocation-popover">
      {["中", "高", "极速"].map((levelName) => (
        <button
          className={level === levelName ? "active" : ""}
          onClick={() => setLevel(levelName)}
          key={levelName}
        >
          <span>{levelName}</span>
          <i>
            <b />
            <b />
            <b />
          </i>
        </button>
      ))}
    </div>
  );
}

function HomeAssetPopover({ onChoose }: { onChoose: () => void }) {
  const [selected, setSelected] = useState<Set<number>>(() => new Set());
  const [tab, setTab] = useState("海报");
  const [query, setQuery] = useState("");
  return (
    <div className="home-asset-popover figma-composer-assets">
      <div className="composer-assets-tabs">
        {["海报", "直播间", "PPT"].map((item) => (
          <button
            className={tab === item ? "active" : ""}
            onClick={() => setTab(item)}
            key={item}
          >
            {item}
          </button>
        ))}
      </div>
      <label className="composer-assets-search">
        <img src="/assets/asset-search.svg" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="搜索"
        />
      </label>
      <div className="composer-assets-grid">
        {samples.slice(0, 2).map((src, i) => (
          <button
            className={selected.has(i) ? "active" : ""}
            onClick={() => setSelected((current) => {
              const next = new Set(current);
              if (next.has(i)) next.delete(i);
              else next.add(i);
              return next;
            })}
            key={src}
          >
            <span>
              <img src={src} />
            </span>
            <strong>{tab === "PPT" ? "课程演示稿" : "小学全科卡"}</strong>
            <small>图片 · 今天</small>
            {selected.has(i) && <b>✓</b>}
          </button>
        ))}
      </div>
      <footer>
        <button className="assets-clear" onClick={() => setSelected(new Set())}>
          ×
        </button>
        <span>已选 {selected.size} 个</span>
        <button className="assets-download" aria-label="下载" onClick={onChoose}>
          <img src="/assets/figma-download-tray.svg" alt="" />
        </button>
      </footer>
    </div>
  );
}

function ModelPopover({
  onClose: _onClose,
  selectedValue,
  onSelect,
}: {
  onClose: () => void;
  selectedValue?: string | null;
  onSelect?: (value: string) => void;
}) {
  const [internalSelected, setInternalSelected] = useState<string | null>(null);
  const selected = selectedValue === undefined ? internalSelected : selectedValue;
  const models = [
    ["图片 5.0 Pro", "商业设计与高密度图文表现", "figma-model-unified.svg"],
    ["图片 5.0 Lite", "响应更精准，生成效果更智能", "figma-model-unified.svg"],
    ["图片 4.5", "风格稳定，图文响应均衡", "figma-model-unified.svg"],
  ];
  return (
    <div className="model-selector-popover">
      <strong>模型选择</strong>
      {models.map(([name, desc, icon]) => (
        <button
          className={selected === name ? "active" : ""}
          onClick={() => {
            if (onSelect) onSelect(name);
            else setInternalSelected(name);
          }}
          key={name}
        >
          <img src={`/assets/${icon}`} />
          <span>
            <b>{name}</b>
            <small>{desc}</small>
          </span>
          {selected === name && (
            <img className="model-check" src="/assets/figma-model-check.svg" />
          )}
        </button>
      ))}
    </div>
  );
}

function FigmaUploadImageIcon() {
  return (
    <span className="figma-upload-image-icon upload-image-icon-v2" aria-hidden="true">
      <svg viewBox="0 0 32 32" role="presentation">
        <path d="M15 5H8.5A3.5 3.5 0 0 0 5 8.5v15A3.5 3.5 0 0 0 8.5 27h15a3.5 3.5 0 0 0 3.5-3.5V17" />
        <path d="m7.5 23 6.25-6.2 4.2 4.15 3.15-3.1 4.4 4.35" />
        <circle cx="21" cy="10.5" r="1.7" />
        <path className="upload-plus" d="M25 3v8M21 7h8" />
      </svg>
    </span>
  );
}

function SizePopover({ onClose }: { onClose: () => void }) {
  const [quality, setQuality] = useState("高");
  const [ratio, setRatio] = useState("9:16");
  const [width, setWidth] = useState("1456");
  const [height, setHeight] = useState("816");
  const [linked, setLinked] = useState(true);
  const ratios = [
    "1:1",
    "3:2",
    "2:3",
    "4:3",
    "3:4",
    "9:16",
    "1:1(2k)",
    "16:9(2k)",
    "9:16(2k)",
    "16:9(4k)",
    "9:16(4k)",
    "智能",
  ];
  return (
    <div className="size-selector-popover">
      <strong>尺寸选择</strong>
      <span className="size-quality-label">生成质量</span>
      <div className="size-quality">
        {["高", "中", "低"].map((v) => (
          <button
            className={quality === v ? "active" : ""}
            onClick={() => setQuality(v)}
            key={v}
          >
            {v}
          </button>
        ))}
      </div>
      <span className="size-section-label">尺寸</span>
      <div className="size-fields">
        <label>
          W <input aria-label="宽度" inputMode="numeric" value={width} onChange={(e) => { const next=e.target.value.replace(/\D/g,""); setWidth(next); const match=ratio.match(/^(\d+):(\d+)/); if(linked&&next&&match) setHeight(String(Math.round(Number(next)*Number(match[2])/Number(match[1])))); }} />
        </label>
        <button className={`size-link-toggle ${linked ? "active" : ""}`} aria-label={linked ? "取消宽高关联" : "关联宽高"} aria-pressed={linked} onClick={()=>setLinked((value)=>!value)}><img src="/assets/figma-size-link.svg" /></button>
        <label>
          H <input aria-label="高度" inputMode="numeric" value={height} onChange={(e) => { const next=e.target.value.replace(/\D/g,""); setHeight(next); const match=ratio.match(/^(\d+):(\d+)/); if(linked&&next&&match) setWidth(String(Math.round(Number(next)*Number(match[1])/Number(match[2])))); }} />
        </label>
      </div>
      <small>选择比例</small>
      <div className="ratio-grid">
        {ratios.map((v) => (
          <button
            className={ratio === v ? "active" : ""}
            onClick={() => {
              setRatio(v);
              const match=v.match(/^(\d+):(\d+)/);
              if(linked&&match) setHeight(String(Math.round(Number(width||1456)*Number(match[2])/Number(match[1]))));
              if (v === "智能") setTimeout(onClose, 120);
            }}
            key={v}
          >
            {v !== "智能" && <i aria-hidden="true" />}
            {v}
          </button>
        ))}
      </div>
    </div>
  );
}

function TemplateGallery({ onSelect }: { onSelect: (index: number) => void }) {
  const [query, setQuery] = useState("");
  const recommendations = ["预热海报", "小红书海报", "PPT优化"];
  const [recommendationIndex, setRecommendationIndex] = useState(0);
  useEffect(() => {
    const timer = window.setInterval(
      () => setRecommendationIndex((current) => (current + 1) % recommendations.length),
      2200,
    );
    return () => window.clearInterval(timer);
  }, []);
  const recommendation = recommendations[recommendationIndex];
  const gallery = [...samples, ...samples];
  return (
    <div className="templates">
      <div className="template-head">
        <span className="template-copy">
          <b>
            <img src="/assets/magic.svg" />
            一键同款
          </b>
          <em>选择图片，自动填入相应 Skill 与风格参数</em>
        </span>
        <label className="mini-search">
          <img src="/assets/search.svg" />
          {!query && <span className="template-search-suggestion" key={recommendation}>{recommendation}</span>}
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="搜索模板"
            placeholder=""
          />
        </label>
      </div>
      <div className="template-gallery-scroll">
        <div className="template-gallery-grid">
          {gallery.map((src, i) => (
            <button
              onClick={() => onSelect(i % samples.length)}
              key={`${src}-${i}`}
              aria-label={`参考图片 ${i + 1}`}
            >
              <img src={src} />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

const templateDetails = [
  {
    title: "夏日新品预热海报",
    model: "图片 4.5",
    ratio: "3:4",
    prompt:
      "清爽明亮的夏日新品预热海报，蓝色渐变背景，突出产品主体与核心卖点，版式简洁，商业摄影质感，柔和光影，高级且富有活力。",
  },
  {
    title: "轻盈自然品牌视觉",
    model: "图片 5.0 Pro",
    ratio: "4:5",
    prompt:
      "轻盈自然的品牌视觉海报，柔和色彩与通透光感，主体居中，留白舒适，现代排版，细腻材质，适合新品发布与社交媒体传播。",
  },
  {
    title: "创意产品展示海报",
    model: "图片 4.5",
    ratio: "1:1",
    prompt:
      "创意产品展示画面，鲜明色彩层次，简约几何构图，产品细节清晰，光影自然，年轻活力，适合品牌活动和电商推广。",
  },
  {
    title: "质感节日营销视觉",
    model: "图片 5.0 Lite",
    ratio: "3:4",
    prompt:
      "节日氛围营销海报，精致装饰元素，温暖明亮的配色，突出优惠信息与产品卖点，层次丰富，商业设计感强。",
  },
  {
    title: "现代生活方式海报",
    model: "图片 4.5",
    ratio: "4:5",
    prompt:
      "现代生活方式主题海报，自然场景与人物互动，柔和光线，真实细腻，简洁标题排版，具有故事感与品牌温度。",
  },
  {
    title: "高级简约产品视觉",
    model: "图片 5.0 Pro",
    ratio: "9:16",
    prompt:
      "高级简约产品视觉，克制配色，大面积留白，精致材质与轮廓光，画面干净通透，适合竖版品牌传播。",
  },
];
const templateExtras = [
  {
    intro:
      "以清爽、轻盈的夏日氛围为核心，通过高明度蓝色和柔和渐变建立新品的第一视觉记忆。信息层级清晰，适合快速传递上市时间、核心卖点与活动权益。",
    style: ["清爽渐变", "商业摄影", "轻盈留白", "年轻活力"],
    scene: "新品上市、社交媒体预热、电商首发、品牌活动主视觉",
    composition:
      "主体居中偏下，标题位于视觉上方；使用柔和轮廓光与细腻高光增强产品质感。",
  },
  {
    intro:
      "强调自然呼吸感与品牌温度，用低饱和色彩、通透光线和舒展留白塑造可信赖的生活方式表达。",
    style: ["自然通透", "低饱和", "现代排版", "品牌质感"],
    scene: "生活方式品牌、护肤新品、内容种草、品牌故事传播",
    composition: "采用稳定的中心构图和柔和景深，辅助信息沿视觉动线分层排列。",
  },
  {
    intro:
      "通过鲜明色彩与几何结构强化产品辨识度，让主体在较小展示尺寸下仍然保持清晰、有趣且富有冲击力。",
    style: ["鲜明撞色", "几何构图", "产品特写", "潮流创意"],
    scene: "电商主图、产品上新、年轻化营销、社交平台传播",
    composition:
      "主体占据画面中心，几何元素形成环绕动势，使用高对比光影强调产品轮廓。",
  },
  {
    intro:
      "将节日情绪与促销信息结合，在保持精致感的同时突出优惠重点，适合快速形成具有仪式感的营销画面。",
    style: ["节日氛围", "精致装饰", "暖色光影", "营销视觉"],
    scene: "节日促销、门店活动、电商会场、会员营销",
    composition:
      "标题、优惠信息与产品形成三段式结构，装饰元素集中在边缘以避免干扰主体。",
  },
  {
    intro:
      "用真实自然的场景和富有情绪的人物互动传递品牌温度，画面兼具故事感、亲和力与传播价值。",
    style: ["生活方式", "自然抓拍", "柔和光线", "情绪叙事"],
    scene: "品牌内容、人物故事、小红书种草、服务型产品推广",
    composition:
      "采用轻微偏心构图和自然景深，保留环境细节，让人物视线引导信息阅读顺序。",
  },
  {
    intro:
      "以克制、精确的视觉语言突出产品材质与轮廓，适合需要高级感和专业可信度的品牌传播。",
    style: ["高级简约", "大面积留白", "精致材质", "轮廓光"],
    scene: "高端产品发布、品牌官网、竖版广告、线下数字屏",
    composition:
      "产品位于黄金分割区域，背景保持纯净，以边缘光和局部高光刻画材质细节。",
  },
];

function TemplateDetail({
  index,
  onClose,
  onUse,
}: {
  index: number;
  onClose: () => void;
  onUse: (prompt: string, model: string, ratio: string) => void;
}) {
  const item = templateDetails[index] || templateDetails[0];
  const extra = templateExtras[index] || templateExtras[0];
  return (
    <section className="template-detail-page" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <button
        className="template-detail-close"
        onClick={onClose}
        aria-label="关闭详情"
      >
        ×
      </button>
      <div className="template-detail-image">
        <img src={samples[index] || samples[0]} alt={item.title} />
      </div>
      <article className="template-detail-info">
        <span className="template-detail-label">灵感模板</span>
        <h1>{item.title}</h1>
        <p className="template-detail-date">点阵跃动 AI 设计 · 精选案例</p>
        <p className="template-detail-intro">{extra.intro}</p>
        <i />
        <h2>图片提示词</h2>
        <p className="template-detail-prompt">{item.prompt}</p>
        <h2 className="template-detail-subtitle">视觉风格</h2>
        <div className="template-detail-tags">
          {extra.style.map((tag) => (
            <span key={tag}>{tag}</span>
          ))}
        </div>
        <dl className="template-detail-spec">
          <div>
            <dt>适用场景</dt>
            <dd>{extra.scene}</dd>
          </div>
          <div>
            <dt>构图与光影</dt>
            <dd>{extra.composition}</dd>
          </div>
        </dl>
        <div className="template-detail-meta">
          <span>{item.model}</span>
          <b>·</b>
          <span>{item.ratio}</span>
          <b>·</b>
          <span>高清</span>
        </div>
        <button
          className="template-detail-use"
          onClick={() => onUse(item.prompt, item.model, item.ratio)}
        >
          <img src="/assets/magic.svg" />
          一键同款
        </button>
      </article>
    </section>
  );
}

function Editor({
  tool,
  setTool,
  prompt,
  onClose,
  onCanvas,
}: {
  tool: EditorTool | null;
  setTool: (v: EditorTool | null) => void;
  prompt: string;
  onClose: () => void;
  onCanvas: () => void;
}) {
  const [zoom, setZoom] = useState(100);
  const [saved, setSaved] = useState(false);
  const [modalPrompt, setModalPrompt] = useState("");
  const [brushSize, setBrushSize] = useState(48);
  const [brushMode, setBrushMode] = useState("画笔");
  const [ratio, setRatio] = useState("原比例");
  const [detail, setDetail] = useState("细节生成强度");
  const [resolution, setResolution] = useState("放大至 4K");
  const [detailOpen, setDetailOpen] = useState(false);
  const [resolutionOpen, setResolutionOpen] = useState(false);
  const [generatedEdit, setGeneratedEdit] = useState(false);
  const toolItems: { name: EditorTool; description: string; icon: string }[] = [
    {
      name: "局部重绘",
      description: "重绘选中区域",
      icon: "figma-local-redraw.svg",
    },
    {
      name: "擦除内容",
      description: "移除不需要的元素",
      icon: "figma-erase.svg",
    },
    {
      name: "图片尺寸",
      description: "调整比例与尺寸",
      icon: "figma-resize.svg",
    },
    {
      name: "增强清晰度",
      description: "提升图片细节",
      icon: "figma-enhance.svg",
    },
  ];
  const openTool = (next: EditorTool) => {
    setTool(next);
    setBrushMode(next === "擦除内容" ? "橡皮" : "画笔");
    setGeneratedEdit(false);
  };
  const closeTool = () => setTool(null);
  return (
    <section className="editor figma-editor-page">
      <header className="figma-editor-topbar">
        <button
          className="editor-close"
          onClick={onClose}
          aria-label="返回生成结果"
        >
          ×
        </button>
        <strong>编辑生成图片</strong>
        <div className="editor-top-actions">
          <button aria-label="收藏">☆</button>
          <button className="editor-download">
            <img src="/assets/editor-download.svg" />
            下载
          </button>
          <button aria-label="更多">•••</button>
        </div>
      </header>
      <div className="figma-editor-workspace">
        <section className="editor-preview-area">
          <p className="editor-section-label">图片预览</p>
          <div className="generated-image-canvas">
            <img
              src="/assets/template-2.png"
              style={{ transform: `scale(${zoom / 100})` }}
              alt="生成图片预览"
            />
          </div>
          <div className="editor-zoom-control">
            <button onClick={() => setZoom((v) => Math.max(50, v - 10))}>
              −
            </button>
            <span>{zoom}%</span>
            <button onClick={() => setZoom((v) => Math.min(200, v + 10))}>
              ＋
            </button>
          </div>
        </section>
        <aside className="figma-edit-panel">
          <div className="edit-prompt-block">
            <h3>本次输入文案</h3>
            <p>
              {prompt ||
                "将图片中的文字替换为“暑期大促 洋葱今晚就涨价”，保留原有的绿色渐变 3D 立体卡通艺术字风格与光泽质感；画面干净无噪点，纯白背景，使用 21:9 宽屏比例。"}
            </p>
            <small>图片 4:5　 21:9　 2K</small>
          </div>
          <div className="edit-functions">
            <h3>编辑功能</h3>
            <div className="figma-tool-grid">
              {toolItems.map((item) => (
                <button
                  className={tool === item.name ? "active" : ""}
                  onClick={() => openTool(item.name)}
                  aria-pressed={tool === item.name}
                  key={item.name}
                >
                  <span>
                    <img src={`/assets/${item.icon}`} />
                  </span>
                  <div>
                    <strong>{item.name}</strong>
                    <small>{item.description}</small>
                  </div>
                </button>
              ))}
            </div>
            <button className="go-canvas" onClick={onCanvas}>
              <img src="/assets/figma-go-canvas.svg" />
              <span>去画布编辑</span>
              <b>›</b>
            </button>
          </div>
          <div className="edit-panel-actions">
            <button onClick={onClose}>重新生成</button>
            <button className="save-edit" onClick={() => setSaved(true)}>
              {saved ? "已保存修改" : "保存修改"}
            </button>
          </div>
        </aside>
      </div>
      {tool && (
        <div className="tool-modal-backdrop" role="presentation">
          <section
            className={`figma-tool-modal modal-${tool}`}
            role="dialog"
            aria-modal="true"
            aria-label={tool}
          >
            <header>
              <strong>{tool}</strong>
              <button onClick={closeTool} aria-label="关闭">
                <img src="/assets/figma-modal-close.svg" />
              </button>
            </header>
            {(tool === "局部重绘" || tool === "擦除内容") && (
              <>
                <div className="modal-canvas-wrap">
                  <div className="modal-image-stage">
                    <img src="/assets/template-2.png" alt="待编辑图片" />
                  </div>
                  <div className="brush-size-control">
                    <img src="/assets/figma-brush-small.svg" />
                    <input
                      aria-label="画笔大小"
                      type="range"
                      min="8"
                      max="100"
                      value={brushSize}
                      onChange={(e) => setBrushSize(Number(e.target.value))}
                    />
                    <img src="/assets/figma-brush-large.svg" />
                  </div>
                  <div className="modal-canvas-footer">
                    <div className="paint-tools">
                      {[
                        ["画笔", "figma-brush.svg"],
                        ["橡皮", "figma-eraser-mode.svg"],
                        ["移动", "figma-hand.svg"],
                      ].map(([name, icon]) => (
                        <button
                          className={brushMode === name ? "active" : ""}
                          onClick={() => setBrushMode(name)}
                          aria-label={name}
                          key={name}
                        >
                          <img src={`/assets/${icon}`} />
                        </button>
                      ))}
                      <i />
                      <button aria-label="撤销">
                        <img src="/assets/figma-undo.svg" />
                      </button>
                      <button aria-label="重做">
                        <img src="/assets/figma-redo.svg" />
                      </button>
                    </div>
                    <div className="modal-zoom">
                      <button>−</button>
                      <span>100%</span>
                      <button>＋</button>
                    </div>
                  </div>
                </div>
                <div className="modal-prompt">
                  <input
                    value={modalPrompt}
                    onChange={(e) => setModalPrompt(e.target.value)}
                    placeholder="描述想要如何更改画面，或涂抹后输入要更改的文案"
                  />
                  <img src="/assets/figma-text-tool.svg" />
                </div>
              </>
            )}
            {tool === "图片尺寸" && (
              <>
                <div className="resize-stage">
                  <div
                    className={`resize-frame ratio-${ratio.replace(":", "-")}`}
                  >
                    <img src="/assets/template-2.png" alt="尺寸预览" />
                    <i />
                    <i />
                    <i />
                    <i />
                  </div>
                </div>
                <div className="ratio-list">
                  {["原比例", "1:1", "3:4", "9:16", "4:3", "16:9"].map((v) => (
                    <button
                      className={ratio === v ? "active" : ""}
                      onClick={() => setRatio(v)}
                      key={v}
                    >
                      <i />
                      <span>{v}</span>
                    </button>
                  ))}
                </div>
                <div className="modal-prompt">
                  <input
                    value={modalPrompt}
                    onChange={(e) => setModalPrompt(e.target.value)}
                    placeholder="描述想要如何更改画面，或涂抹后输入要更改的文案"
                  />
                  <img src="/assets/figma-text-tool.svg" />
                </div>
              </>
            )}
            {tool === "增强清晰度" && (
              <>
                <div className="enhance-stage">
                  <img src="/assets/template-2.png" alt="清晰度预览" />
                </div>
                <div className="enhance-options">
                  <div className="enhance-option-wrap">
                    <button
                      aria-expanded={detailOpen}
                      onClick={() => {
                        setDetailOpen(!detailOpen);
                        setResolutionOpen(false);
                      }}
                    >
                      ☷　{detail}
                    </button>
                    {detailOpen && (
                      <div
                        className="enhance-popover detail-popover"
                        role="listbox"
                        aria-label="细节生成强度选项"
                      >
                        {[
                          "轻度细节生成",
                          "标准细节生成",
                          "高细节生成",
                          "超高细节生成",
                        ].map((v, i) => (
                          <button
                            className={detail === v ? "active" : ""}
                            role="option"
                            aria-selected={detail === v}
                            onClick={() => {
                              setDetail(v);
                              setDetailOpen(false);
                            }}
                            key={v}
                          >
                            <strong>{v}</strong>
                            <small>
                              {
                                [
                                  "保留原图结构，轻微补充细节",
                                  "平衡画面清晰度与自然度",
                                  "强化纹理、文字与边缘细节",
                                  "最大程度增强复杂画面细节",
                                ][i]
                              }
                            </small>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="enhance-option-wrap resolution-wrap">
                    <button
                      aria-expanded={resolutionOpen}
                      onClick={() => {
                        setResolutionOpen(!resolutionOpen);
                        setDetailOpen(false);
                      }}
                    >
                      {resolution}　⌃
                    </button>
                    {resolutionOpen && (
                      <div
                        className="enhance-popover resolution-popover"
                        role="listbox"
                        aria-label="放大分辨率选项"
                      >
                        {[
                          "放大至 2K",
                          "放大至 4K",
                          "放大至 8K",
                          "自定义尺寸",
                        ].map((v) => (
                          <button
                            className={resolution === v ? "active" : ""}
                            role="option"
                            aria-selected={resolution === v}
                            onClick={() => {
                              setResolution(v);
                              setResolutionOpen(false);
                            }}
                            key={v}
                          >
                            {v}
                            <small>{v === "放大至 4K" ? "推荐" : ""}</small>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}
            <button
              className="modal-generate"
              onClick={() => setGeneratedEdit(true)}
            >
              {generatedEdit ? "已生成" : "生成"}
            </button>
          </section>
        </div>
      )}
    </section>
  );
}

function Canvas({
  canvasImage,
  canvasImageName,
  initialAssets,
  setCanvasImage,
  folders,
  setFolders,
  upload,
  onEdit,
  onBack,
}: {
  canvasImage: string | null;
  canvasImageName: string;
  initialAssets: Array<{ name: string; url: string }>;
  setCanvasImage: (v: string | null) => void;
  folders: string[];
  setFolders: (v: string[]) => void;
  upload: (f?: File) => void;
  onEdit: () => void;
  onBack: () => void;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const [mode, setMode] = useState<
    "focus" | "assets" | "folder" | "history" | "comments" | "account" | null
  >(null);
  const [selectedTeacher, setSelectedTeacher] = useState(0);
  const [applied, setApplied] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [quickOpen, setQuickOpen] = useState(false);
  const [canvasTool, setCanvasTool] = useState("移动");
  const [redrawMode, setRedrawMode] = useState("画笔");
  const [redrawBrushSize, setRedrawBrushSize] = useState(48);
  type RedrawStroke = { nodeId: number; size: number; kind: "brush" | "box" | "erase"; points: Array<{ x: number; y: number }> };
  const [redrawStrokes, setRedrawStrokes] = useState<RedrawStroke[]>([]);
  const [activeRedrawStroke, setActiveRedrawStroke] = useState<RedrawStroke | null>(null);
  const [redrawUndoStack, setRedrawUndoStack] = useState<RedrawStroke[][]>([]);
  const [redrawRedoStack, setRedrawRedoStack] = useState<RedrawStroke[][]>([]);
  const [redrawCursor, setRedrawCursor] = useState<{ nodeId: number; x: number; y: number } | null>(null);
  useEffect(() => {
    if (!["局部重绘", "擦除"].includes(canvasTool)) return;
    setRedrawMode("画笔");
    setRedrawStrokes([]);
    setActiveRedrawStroke(null);
    setRedrawUndoStack([]);
    setRedrawRedoStack([]);
  }, [canvasTool]);
  const [imageMenu, setImageMenu] = useState<{ x: number; y: number } | null>(
    null,
  );
  const [addPosition, setAddPosition] = useState({ x: 640, y: 138 });
  const [folderDone, setFolderDone] = useState(false);
  const [folderExpanded, setFolderExpanded] = useState(false);
  const [folderIndex, setFolderIndex] = useState(2);
  const [projectTitle, setProjectTitle] = useState(canvasImageName || "AI 视觉创作 · 未命名项目");
  const [folderName, setFolderName] = useState("");
  const [folderNames, setFolderNames] = useState([
    "项目名称1",
    "项目名称2",
    "项目名称3",
    "项目名称4",
    "项目名称5",
  ]);
  const [folderColors, setFolderColors] = useState([
    "hsl(348 100% 96%)",
    "hsl(28 100% 96%)",
    "hsl(52 100% 96%)",
    "hsl(142 100% 96%)",
    "hsl(190 100% 96%)",
    "#EDECFF",
  ]);
  const [folderColorOpen, setFolderColorOpen] = useState<number | null>(null);
  const [folderDeleteIndex, setFolderDeleteIndex] = useState<number | null>(null);
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(
    null,
  );
  const [selection, setSelection] = useState<{
    x: number;
    y: number;
    width: number;
    height: number;
  } | null>(null);
  const [canvasNodes, setCanvasNodes] = useState<CanvasNode[]>(() =>
    initialAssets.length
      ? initialAssets.map((asset,index)=>({id:index+1,url:asset.url,name:asset.name,x:(index-(initialAssets.length-1)/2)*390,y:0}))
      : canvasImage
        ? [{ id: 1, url: canvasImage, x: 0, y: 0, name: canvasImageName }]
      : [],
  );
  const canvasClipboardRef = useRef<CanvasNode[]>([]);
  const canvasClipboardGroupRef = useRef<{ name: string; nodeIds: number[] } | null>(null);
  const canvasPasteOffsetRef = useRef(0);
  const CANVAS_WORLD_SIZE = 6000;
  const CANVAS_WORLD_CENTER = CANVAS_WORLD_SIZE / 2;
  const getNodeGeometry = (node: CanvasNode) => {
    const mediaWidth = node.mediaWidth ?? 298;
    const mediaHeight = node.mediaHeight ?? 310;
    return {
      mediaWidth,
      mediaHeight,
      cardWidth: mediaWidth + 22,
      cardHeight: mediaHeight + 88,
      centerY: CANVAS_WORLD_CENTER + node.y - 34,
    };
  };
  const updateNodeImageSize = (id: number, naturalWidth: number, naturalHeight: number) => {
    if (!naturalWidth || !naturalHeight) return;
    const scale = Math.min(360 / naturalWidth, 420 / naturalHeight);
    const mediaWidth = Math.max(180, Math.round(naturalWidth * scale));
    const mediaHeight = Math.max(120, Math.round(naturalHeight * scale));
    setCanvasNodes((nodes) => nodes.map((node) =>
      node.id === id && (node.mediaWidth !== mediaWidth || node.mediaHeight !== mediaHeight)
        ? { ...node, mediaWidth, mediaHeight }
        : node,
    ));
  };
  const getCanvasPoint = (clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: clientX, y: clientY };
    const box = canvas.getBoundingClientRect();
    const scale = canvasZoom / 75;
    const localX = clientX - box.left + canvas.scrollLeft;
    const localY = clientY - box.top + canvas.scrollTop;
    return {
      x: localX / scale,
      y: localY / scale,
    };
  };
  const getViewportCenterOffset = () => {
    const canvas = canvasRef.current;
    if (!canvas || canvasNodes.length === 0) return { x: 0, y: 0 };
    const box = canvas.getBoundingClientRect();
    const point = getCanvasPoint(box.left + box.width / 2, box.top + box.height / 2);
    return { x: point.x - CANVAS_WORLD_CENTER, y: point.y - CANVAS_WORLD_CENTER };
  };
  const [imageDrag, setImageDrag] = useState<{
    id: number;
    pointerId: number;
    startX: number;
    startY: number;
    origins: Record<number, { x: number; y: number }>;
  } | null>(null);
  const [canvasLinks, setCanvasLinks] = useState<CanvasLink[]>([]);
  const [hdProgress, setHdProgress] = useState<Record<number, number>>({});
  const [keywordPopoverNodeId, setKeywordPopoverNodeId] = useState<number | null>(null);
  const [copiedKeywordNodeId, setCopiedKeywordNodeId] = useState<number | null>(null);
  const [expandFrame, setExpandFrame] = useState<{ id: number; width: number; height: number } | null>(null);
  const [expandResize, setExpandResize] = useState<{ pointerId: number; startX: number; startY: number; width: number; height: number; axis: string } | null>(null);
  const [linkDraft, setLinkDraft] = useState<{
    from: number;
    side: "left" | "right";
    x: number;
    y: number;
  } | null>(null);
  const [pendingLink, setPendingLink] = useState<{
    from: number;
    side: "left" | "right";
  } | null>(null);
  const [selectedNodeIds, setSelectedNodeIds] = useState<number[]>([]);
  const [activeNodeId, setActiveNodeId] = useState<number | null>(null);
  const [cropClosing, setCropClosing] = useState(false);
  const [canvasZoom, setCanvasZoom] = useState(75);
  const zoomTargetRef = useRef(75);
  const zoomAppliedRef = useRef(75);
  const zoomFrameRef = useRef<number | null>(null);
  const zoomPointerRef = useRef<{ x: number; y: number } | null>(null);
  const canvasWasEmpty = useRef(true);
  const zoomCanvasAtPoint = (nextZoom: number, clientX?: number, clientY?: number) => {
    const canvas = canvasRef.current;
    const boundedZoom = Math.max(25, Math.min(200, nextZoom));
    zoomTargetRef.current = boundedZoom;
    if (!canvas) {
      setCanvasZoom(boundedZoom);
      return;
    }
    const box = canvas.getBoundingClientRect();
    const pointerX = (clientX ?? box.left + box.width / 2) - box.left;
    const pointerY = (clientY ?? box.top + box.height / 2) - box.top;
    const oldScale = zoomAppliedRef.current / 75;
    const newScale = boundedZoom / 75;
    const worldX = (canvas.scrollLeft + pointerX) / oldScale;
    const worldY = (canvas.scrollTop + pointerY) / oldScale;
    zoomAppliedRef.current = boundedZoom;
    flushSync(() => setCanvasZoom(boundedZoom));
    canvas.scrollLeft = worldX * newScale - pointerX;
    canvas.scrollTop = worldY * newScale - pointerY;
  };
  useEffect(() => () => {
    if (zoomFrameRef.current !== null) cancelAnimationFrame(zoomFrameRef.current);
  }, []);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    if (!canvasNodes.length) {
      canvasWasEmpty.current = true;
      zoomAppliedRef.current = 75;
      zoomTargetRef.current = 75;
      setCanvasZoom(75);
      canvas.scrollTo({ left: 0, top: 0 });
      return;
    }
    if (!canvasWasEmpty.current) return;
    canvasWasEmpty.current = false;
    window.requestAnimationFrame(() => {
      const scale = canvasZoom / 75;
      canvas.scrollTo({
        left: CANVAS_WORLD_CENTER * scale - canvas.clientWidth / 2,
        top: CANVAS_WORLD_CENTER * scale - canvas.clientHeight / 2,
      });
    });
  }, [canvasNodes.length]);
  const [promptPopover, setPromptPopover] = useState<"model" | "size" | null>(
    null,
  );
  const [promptModel, setPromptModel] = useState("图片 4.5");
  const [promptQuality, setPromptQuality] = useState("高");
  const [promptRatio, setPromptRatio] = useState("9:16");
  const [focusEdit, setFocusEdit] = useState(false);
  const [referenceSelect, setReferenceSelect] = useState(false);
  const [focusRecenterVisible, setFocusRecenterVisible] = useState(true);
  const suppressFocusScroll = useRef(false);
  const [focusNodeId, setFocusNodeId] = useState<number | null>(null);
  const [focusMasterId, setFocusMasterId] = useState<number | null>(null);
  const [focusPicks, setFocusPicks] = useState<
    Array<{
      id: number;
      nodeId: number;
      anchorX: number;
      anchorY: number;
      mediaX: number;
      mediaY: number;
      mediaW: number;
      mediaH: number;
      choice: number;
      open: boolean;
    }>
  >([]);
  const [activeFocusTagId, setActiveFocusTagId] = useState<number | null>(null);
  const [canvasPromptTexts, setCanvasPromptTexts] = useState<Record<number, string>>({});
  const [canvasToolPromptText, setCanvasToolPromptText] = useState("");
  const [focusTrailingText, setFocusTrailingText] = useState<
    Record<number, string>
  >({});
  const [uploadTargetNodeId, setUploadTargetNodeId] = useState<number | null>(
    null,
  );
  const [commentPosition, setCommentPosition] = useState<{
    x: number;
    y: number;
    viewportX: number;
    viewportY: number;
  } | null>(null);
  const [canvasGroups, setCanvasGroups] = useState<
    Array<{ id: number; nodeIds: number[]; name: string }>
  >([]);
  const [activeGroupId, setActiveGroupId] = useState<number | null>(null);
  const [contextGroupId, setContextGroupId] = useState<number | null>(null);
  const [groupNameEditing, setGroupNameEditing] = useState<number | null>(null);
  const [groupNameDraft, setGroupNameDraft] = useState("未命名组");
  useEffect(() => {
    const dismissUngroup = (event: PointerEvent) => {
      if ((event.target as HTMLElement).closest(".canvas-ungroup-button")) return;
      setContextGroupId(null);
    };
    window.addEventListener("pointerdown", dismissUngroup);
    return () => window.removeEventListener("pointerdown", dismissUngroup);
  }, []);
  const [canvasComments, setCanvasComments] = useState<
    Array<{
      id: number;
      x: number;
      y: number;
      viewportX: number;
      viewportY: number;
      text: string;
    }>
  >([]);
  const [selectedCommentIds, setSelectedCommentIds] = useState<number[]>([]);
  const cropExitTimer = useRef<number | null>(null);
  const selectionHoldTimer = useRef<number | null>(null);
  const selectionOrigin = useRef<{ x: number; y: number } | null>(null);
  const selectionPointer = useRef<{ x: number; y: number } | null>(null);
  const focusIconPress = useRef<{ x: number; y: number; time: number } | null>(
    null,
  );
  const removeFocusPick = (id: number) => {
    const index = focusPicks.findIndex((pick) => pick.id === id);
    const tail = focusTrailingText[id] || "";
    if (index <= 0) {
      const ownerId = focusNodeId ?? activeNodeId;
      if (ownerId !== null)
        setCanvasPromptTexts((values) => ({ ...values, [ownerId]: (values[ownerId] || "") + tail }));
    }
    else {
      const previousId = focusPicks[index - 1].id;
      setFocusTrailingText((values) => ({
        ...values,
        [previousId]: (values[previousId] || "") + tail,
      }));
    }
    setFocusTrailingText((values) => {
      const next = { ...values };
      delete next[id];
      return next;
    });
    setFocusPicks((items) => items.filter((item) => item.id !== id));
    setActiveFocusTagId((current) => (current === id ? null : current));
  };
  const exitFocusEdit = () => {
    if (focusNodeId !== null) {
      const targets = [
        ...new Set(
          focusPicks
            .map((pick) => pick.nodeId)
            .filter((id) => id !== focusNodeId),
        ),
      ];
      setCanvasLinks((links) => {
        const next = [...links];
        const main = canvasNodes.find((node) => node.id === focusNodeId);
        targets.forEach((targetId, index) => {
          if (
            next.some(
              (link) =>
                (link.from === focusNodeId && link.to === targetId) ||
                (link.from === targetId && link.to === focusNodeId),
            )
          )
            return;
          const target = canvasNodes.find((node) => node.id === targetId);
          const targetOnRight = (target?.x ?? 0) >= (main?.x ?? 0);
          next.push({
            id: Date.now() + index,
            from: focusNodeId,
            side: targetOnRight ? "right" : "left",
            to: targetId,
            targetSide: targetOnRight ? "left" : "right",
          });
        });
        return next;
      });
    }
    setFocusEdit(false);
    setFocusNodeId(null);
    setPromptPopover(null);
  };
  useEffect(() => {
    if (canvasImage && !canvasNodes.some((n) => n.url === canvasImage))
      setCanvasNodes((v) => [
        ...v,
        {
          id: Date.now(),
          url: canvasImage,
          x: 0,
          y: 0,
          name: canvasImageName,
        },
      ]);
  }, [canvasImage, canvasImageName, canvasNodes]);
  useEffect(() => {
    if (!dragStart || !selection) return;
    const endX =
      selection.x === dragStart.x ? selection.x + selection.width : selection.x;
    const endY =
      selection.y === dragStart.y
        ? selection.y + selection.height
        : selection.y;
    const next = {
      x: dragStart.x,
      y: dragStart.y,
      width: Math.max(0, endX - dragStart.x),
      height: Math.max(0, endY - dragStart.y),
    };
    if (
      next.x !== selection.x ||
      next.y !== selection.y ||
      next.width !== selection.width ||
      next.height !== selection.height
    )
      setSelection(next);
  }, [selection, dragStart]);
  useEffect(() => {
    if (!selection) {
      setSelectedNodeIds([]);
      setSelectedCommentIds([]);
      canvasRef.current
        ?.querySelectorAll<HTMLElement>("[data-node-id]")
        .forEach((el) => el.removeAttribute("data-selected"));
      return;
    }
    if (dragStart) return;
    const ids = canvasNodes
      .filter((node) => {
        const geometry = getNodeGeometry(node);
        const left = CANVAS_WORLD_CENTER + node.x - geometry.cardWidth / 2,
          top = CANVAS_WORLD_CENTER + node.y - geometry.cardHeight / 2,
          right = left + geometry.cardWidth,
          bottom = top + geometry.cardHeight;
        return (
          selection.x < right &&
          selection.x + selection.width > left &&
          selection.y < bottom &&
          selection.y + selection.height > top
        );
      })
      .map((n) => n.id);
    setSelectedNodeIds(ids);
    if (ids.length) {
      const selectedBounds = canvasNodes
        .filter((node) => ids.includes(node.id))
        .map((node) => {
          const geometry = getNodeGeometry(node);
          const left = CANVAS_WORLD_CENTER + node.x - geometry.cardWidth / 2;
          const top = CANVAS_WORLD_CENTER + node.y - geometry.cardHeight / 2;
          return {
            left,
            top,
            right: left + geometry.cardWidth,
            bottom: top + geometry.cardHeight,
          };
        });
      const snapped = {
        x: Math.min(...selectedBounds.map((bound) => bound.left)),
        y: Math.min(...selectedBounds.map((bound) => bound.top)),
        width:
          Math.max(...selectedBounds.map((bound) => bound.right)) -
          Math.min(...selectedBounds.map((bound) => bound.left)),
        height:
          Math.max(...selectedBounds.map((bound) => bound.bottom)) -
          Math.min(...selectedBounds.map((bound) => bound.top)),
      };
      if (
        Math.abs(selection.x - snapped.x) > 0.5 ||
        Math.abs(selection.y - snapped.y) > 0.5 ||
        Math.abs(selection.width - snapped.width) > 0.5 ||
        Math.abs(selection.height - snapped.height) > 0.5
      ) {
        setSelection(snapped);
      }
    }
    setSelectedCommentIds(
      canvasComments
        .filter(
          (comment) =>
            comment.x >= selection.x &&
            comment.x <= selection.x + selection.width &&
            comment.y >= selection.y &&
            comment.y <= selection.y + selection.height,
        )
        .map((comment) => comment.id),
    );
    canvasRef.current
      ?.querySelectorAll<HTMLElement>("[data-node-id]")
      .forEach((el) =>
        el.toggleAttribute(
          "data-selected",
          ids.includes(Number(el.dataset.nodeId)),
        ),
      );
  }, [selection, dragStart, canvasNodes, canvasComments]);
  useEffect(() => {
    const ids = new Set(canvasNodes.map((node) => node.id));
    setCanvasGroups((groups) =>
      groups
        .map((group) => ({ ...group, nodeIds: group.nodeIds.filter((id) => ids.has(id)) }))
        .filter((group) => group.nodeIds.length >= 2),
    );
    setCanvasLinks((links) =>
      links.filter((link) => ids.has(link.from) && ids.has(link.to)),
    );
    setFocusPicks((picks) =>
      focusMasterId !== null && !ids.has(focusMasterId)
        ? []
        : picks.filter((pick) => ids.has(pick.nodeId)),
    );
    if (focusNodeId !== null && !ids.has(focusNodeId)) {
      setFocusEdit(false);
      setFocusNodeId(null);
    }
    if (activeNodeId !== null && !ids.has(activeNodeId)) setActiveNodeId(null);
  }, [canvasNodes, activeNodeId, focusNodeId, focusMasterId]);
  useEffect(() => {
    const removeSelected = (event: KeyboardEvent) => {
      if (
        event.defaultPrevented ||
        (event.key !== "Delete" && event.key !== "Backspace")
      )
        return;
      const target = event.target as HTMLElement;
      if (
        target.closest(
          'input,textarea,[contenteditable="true"],.canvas-focus-prompt-tags',
        )
      )
        return;
      let ids = activeGroupId !== null
        ? canvasGroups.find((group) => group.id === activeGroupId)?.nodeIds || []
        : selectedNodeIds;
      if (selection && canvasRef.current) {
        const canvasBox = canvasRef.current.getBoundingClientRect();
        ids = Array.from(
          canvasRef.current.querySelectorAll<HTMLElement>("[data-node-id]"),
        )
          .filter((element) => {
            const rect = element.getBoundingClientRect();
            const scale = canvasZoom / 75;
            const left =
                (rect.left - canvasBox.left + canvasRef.current!.scrollLeft) / scale,
              top = (rect.top - canvasBox.top + canvasRef.current!.scrollTop) / scale,
              width = rect.width / scale,
              height = rect.height / scale;
            return (
              selection.x < left + width &&
              selection.x + selection.width > left &&
              selection.y < top + height &&
              selection.y + selection.height > top
            );
          })
          .map((element) => Number(element.dataset.nodeId));
      }
      if (!ids.length && activeNodeId !== null) ids = [activeNodeId];
      if (!ids.length && !selectedCommentIds.length) return;
      event.preventDefault();
      const removing = new Set(ids);
      const removingComments = new Set(selectedCommentIds);
      const remaining = canvasNodes.filter((node) => !removing.has(node.id));
      setCanvasNodes(remaining);
      setCanvasImage(remaining.find((node) => !node.placeholder)?.url || null);
      setCanvasComments((comments) =>
        comments.filter((comment) => !removingComments.has(comment.id)),
      );
      setCanvasLinks((links) =>
        links.filter(
          (link) => !removing.has(link.from) && !removing.has(link.to),
        ),
      );
      setActiveNodeId(null);
      setActiveGroupId(null);
      setContextGroupId(null);
      setSelectedNodeIds([]);
      setSelectedCommentIds([]);
      setSelection(null);
      setCanvasTool("移动");
    };
    window.addEventListener("keydown", removeSelected);
    return () => window.removeEventListener("keydown", removeSelected);
  }, [
    activeNodeId,
    activeGroupId,
    canvasGroups,
    selectedNodeIds,
    selectedCommentIds,
    selection,
    canvasNodes,
    setCanvasImage,
  ]);
  useEffect(() => {
    const copyPasteImages = (event: KeyboardEvent) => {
      if (!(event.ctrlKey || event.metaKey) || event.altKey) return;
      const target = event.target as HTMLElement;
      if (target.closest('input,textarea,[contenteditable="true"]')) return;
      const key = event.key.toLowerCase();
      if (key === "c") {
        const copiedGroup = activeGroupId !== null
          ? canvasGroups.find((group) => group.id === activeGroupId) || null
          : null;
        const ids = copiedGroup
          ? copiedGroup.nodeIds
          : selectedNodeIds.length
            ? selectedNodeIds
            : activeNodeId !== null
              ? [activeNodeId]
              : [];
        if (!ids.length) return;
        canvasClipboardRef.current = canvasNodes
          .filter((node) => ids.includes(node.id))
          .map((node) => ({ ...node }));
        canvasClipboardGroupRef.current = copiedGroup
          ? { name: copiedGroup.name, nodeIds: [...copiedGroup.nodeIds] }
          : null;
        canvasPasteOffsetRef.current = 0;
        event.preventDefault();
        return;
      }
      if (key !== "v" || !canvasClipboardRef.current.length) return;
      event.preventDefault();
      canvasPasteOffsetRef.current += 36;
      const offset = canvasPasteOffsetRef.current;
      const firstId = Math.max(Date.now(), Math.max(0, ...canvasNodes.map((node) => node.id)) + 1);
      const idMap = new Map<number, number>();
      const pasted = canvasClipboardRef.current.map((node, index) => ({
        ...node,
        id: (() => {
          const id = firstId + index;
          idMap.set(node.id, id);
          return id;
        })(),
        x: node.x + offset,
        y: node.y + offset,
        name: `${node.name} 副本`,
      }));
      setCanvasNodes((nodes) => [...nodes, ...pasted]);
      const copiedGroup = canvasClipboardGroupRef.current;
      if (copiedGroup) {
        const pastedGroupId = firstId + pasted.length + 1;
        setCanvasGroups((groups) => [
          ...groups,
          {
            id: pastedGroupId,
            nodeIds: copiedGroup.nodeIds
              .map((id) => idMap.get(id))
              .filter((id): id is number => id !== undefined),
            name: `${copiedGroup.name} 副本`,
          },
        ]);
        setActiveGroupId(pastedGroupId);
      } else {
        setActiveGroupId(null);
      }
      setCanvasImage(pasted[0]?.url || null);
      setActiveNodeId(pasted[0]?.id || null);
      setContextGroupId(null);
      setSelection(null);
      setSelectedNodeIds([]);
    };
    window.addEventListener("keydown", copyPasteImages);
    return () => window.removeEventListener("keydown", copyPasteImages);
  }, [activeGroupId, activeNodeId, canvasGroups, canvasNodes, selectedNodeIds, setCanvasImage]);
  useEffect(() => {
    canvasRef.current
      ?.querySelectorAll<HTMLElement>("[data-node-id]")
      .forEach((el) =>
        el.toggleAttribute(
          "data-active",
          Number(el.dataset.nodeId) === activeNodeId,
        ),
      );
  }, [activeNodeId, canvasNodes]);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const down = (event: PointerEvent) => {
      const target = event.target as HTMLElement;
      if (target.closest(".canvas-bottom-dock,.canvas-crop-workspace")) return;
      const card = target.closest<HTMLElement>(".canvas-node-card");
      if (card && target.closest(".canvas-node-port")) return;
      if (card) {
        setActiveNodeId(null);
        return;
      }
      if (!target.closest(".canvas-node-prompt")) setActiveNodeId(null);
    };
    const up = (event: PointerEvent) => {
      const target = event.target as HTMLElement;
      const card = target.closest<HTMLElement>(".canvas-node-card");
      if (card && !target.closest(".canvas-node-port"))
        setActiveNodeId(Number(card.dataset.nodeId));
    };
    canvas.addEventListener("pointerdown", down, { capture: true });
    canvas.addEventListener("pointerup", up, { capture: true });
    return () => {
      canvas.removeEventListener("pointerdown", down, { capture: true });
      canvas.removeEventListener("pointerup", up, { capture: true });
    };
  }, []);
  useEffect(() => {
    const undoRedraw = (event: KeyboardEvent) => {
      if (!["局部重绘", "擦除"].includes(canvasTool) || !(event.ctrlKey || event.metaKey) || event.key.toLowerCase() !== "z") return;
      event.preventDefault();
      setActiveRedrawStroke(null);
      setRedrawUndoStack((history) => {
        if (!history.length) return history;
        const previous = history[history.length - 1];
        setRedrawStrokes((current) => { setRedrawRedoStack((redo) => [...redo, current]); return previous; });
        return history.slice(0, -1);
      });
    };
    window.addEventListener("keydown", undoRedraw);
    return () => window.removeEventListener("keydown", undoRedraw);
  }, [canvasTool]);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !selection || dragStart) return;
    const clearSelection = (event: PointerEvent) => {
      if ((event.target as HTMLElement).closest(".selection-action-stack,.create-folder-button"))
        return;
      if ((event.target as HTMLElement).closest(".canvas-node-card[data-selected]"))
        return;
      setSelection(null);
    };
    canvas.addEventListener("pointerdown", clearSelection, { capture: true });
    return () =>
      canvas.removeEventListener("pointerdown", clearSelection, {
        capture: true,
      });
  }, [selection, dragStart]);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || canvasTool !== "裁剪") return;
    const leaveCrop = (event: PointerEvent) => {
      const target = event.target as HTMLElement;
      if (
        target.closest(
          ".canvas-crop-stage,.canvas-bottom-dock,.canvas-vertical-nav",
        )
      )
        return;
      setCropClosing(true);
      if (cropExitTimer.current) window.clearTimeout(cropExitTimer.current);
      cropExitTimer.current = window.setTimeout(() => {
        setCanvasTool("移动");
        setCropClosing(false);
      }, 240);
    };
    canvas.addEventListener("pointerdown", leaveCrop, { capture: true });
    return () =>
      canvas.removeEventListener("pointerdown", leaveCrop, { capture: true });
  }, [canvasTool]);
  useEffect(
    () => () => {
      if (cropExitTimer.current) window.clearTimeout(cropExitTimer.current);
    },
    [],
  );
  useEffect(() => {
    const dismiss = () => {
      setAddOpen(false);
      setQuickOpen(false);
      setImageMenu(null);
      setMode((current) => (current === "folder" ? current : null));
      setSelectedTeacher(0);
    };
    document.addEventListener("dismiss-popovers", dismiss);
    return () => document.removeEventListener("dismiss-popovers", dismiss);
  }, []);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const wheel = (event: WheelEvent) => {
      const target = event.target as HTMLElement;
      if (target.closest(".canvas-search-modal,.figma-history-panel,.asset-library-panel"))
        return;
      if (!canvasNodes.length) {
        event.preventDefault();
        return;
      }
      if (mode === "folder") {
        event.preventDefault();
        return;
      }
      if (event.ctrlKey || event.metaKey) {
        if (
          target.closest(
            'input,textarea,button,select,[contenteditable="true"],.canvas-node-prompt,.canvas-bottom-dock,.canvas-vertical-nav,.figma-zoom,.canvas-add-popover,.canvas-model-popover,.canvas-size-popover,.canvas-comment-panel,.figma-history-panel,.asset-library-panel,.canvas-search-modal,.canvas-crop-workspace',
          ) && !target.closest(".canvas-placeholder-upload") && !target.closest(".canvas-node-prompt")
        )
          return;
        event.preventDefault();
        zoomTargetRef.current = Math.max(25, Math.min(200, zoomTargetRef.current * Math.exp(-event.deltaY * 0.00072)));
        zoomPointerRef.current = { x: event.clientX, y: event.clientY };
        if (zoomFrameRef.current === null) {
          zoomFrameRef.current = window.requestAnimationFrame(() => {
            const point = zoomPointerRef.current;
            zoomFrameRef.current = null;
            zoomCanvasAtPoint(zoomTargetRef.current, point?.x, point?.y);
          });
        }
        return;
      }
      event.preventDefault();
      canvas.scrollLeft += event.shiftKey ? event.deltaY : event.deltaX;
      canvas.scrollTop += event.shiftKey ? event.deltaX : event.deltaY;
    };
    canvas.addEventListener("wheel", wheel, { passive: false });
    return () => canvas.removeEventListener("wheel", wheel);
  }, [canvasZoom, mode, canvasNodes.length]);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const blockContentDoubleClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      // Let the asset drawer handle its own double-click-to-rename action.
      if (target.closest(".asset-library-panel")) return;
      const icon =
        target.tagName === "IMG" && !target.closest(".canvas-node-media");
      if (
        icon ||
        target.closest(
          'button,input,textarea,select,[role="button"],.canvas-node-prompt,.canvas-add-popover,.canvas-model-popover,.canvas-size-popover,.canvas-focus-toast,.canvas-crop-workspace,.canvas-search-modal,.asset-library-panel,.figma-history-panel,.canvas-comment-panel',
        )
      ) {
        event.stopPropagation();
        return;
      }
      if (target.closest(".canvas-node-card")) {
        const box = canvas.getBoundingClientRect();
        setSelection(null);
        setAddPosition({
          x: Math.max(8, Math.min(event.clientX - box.left, box.width - 256)),
          y: Math.max(8, Math.min(event.clientY - box.top, box.height - 430)),
        });
        setAddOpen(true);
        setMode(null);
        setQuickOpen(false);
      }
    };
    canvas.addEventListener("dblclick", blockContentDoubleClick, {
      capture: true,
    });
    return () =>
      canvas.removeEventListener("dblclick", blockContentDoubleClick, {
        capture: true,
      });
  }, []);
  useEffect(() => {
    canvasRef.current?.classList.toggle("canvas-focus-edit-mode", focusEdit || referenceSelect);
    return () => canvasRef.current?.classList.remove("canvas-focus-edit-mode");
  }, [focusEdit, referenceSelect]);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !referenceSelect || focusMasterId === null) return;
    const chooseReference = (event: MouseEvent) => {
      const card = (event.target as HTMLElement).closest<HTMLElement>(".canvas-node-card");
      if (!card) return;
      const targetId = Number(card.dataset.nodeId);
      if (!targetId || targetId === focusMasterId) return;
      const main = canvasNodes.find((node) => node.id === focusMasterId);
      const target = canvasNodes.find((node) => node.id === targetId);
      if (!main || !target) return;
      const sides = target.x >= main.x
        ? { side: "right" as const, targetSide: "left" as const }
        : { side: "left" as const, targetSide: "right" as const };
      setCanvasLinks((links) => links.some((link) =>
        (link.from === main.id && link.to === target.id) ||
        (link.from === target.id && link.to === main.id)
      ) ? links : [...links, { id: Date.now(), from: main.id, to: target.id, ...sides }]);
      event.preventDefault();
      event.stopPropagation();
    };
    canvas.addEventListener("click", chooseReference, { capture: true });
    return () => canvas.removeEventListener("click", chooseReference, { capture: true });
  }, [referenceSelect, focusMasterId, canvasNodes]);
  useEffect(() => {
    if (!focusEdit) return;
    const exit = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      exitFocusEdit();
    };
    window.addEventListener("keydown", exit);
    return () => window.removeEventListener("keydown", exit);
  }, [focusEdit, focusNodeId, focusPicks, canvasNodes]);
  useEffect(() => {
    canvasRef.current
      ?.querySelectorAll<HTMLElement>("[data-node-id]")
      .forEach((el) =>
        el.toggleAttribute(
          "data-focus-target",
          focusEdit && Number(el.dataset.nodeId) === focusNodeId,
        ),
      );
  }, [focusEdit, focusNodeId, canvasNodes]);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !focusEdit) return;
    const pick = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (target.closest(".canvas-focus-label,.canvas-focus-options")) return;
      const media = target.closest<HTMLElement>(".canvas-node-media");
      const card = target.closest<HTMLElement>(".canvas-node-card");
      if (!media || !card || Number(card.dataset.nodeId) === focusNodeId)
        return;
      const box = canvas.getBoundingClientRect(),
        mediaBox = media.getBoundingClientRect();
      const relativeY = (event.clientY - mediaBox.top) / mediaBox.height;
      const choice = relativeY < 0.34 ? 1 : relativeY > 0.67 ? 3 : 0;
      setFocusPicks((items) => [
        ...items,
        {
          id: Date.now() + Math.random(),
          nodeId: Number(card.dataset.nodeId),
          anchorX: event.clientX - box.left + canvas.scrollLeft,
          anchorY: event.clientY - box.top + canvas.scrollTop,
          mediaX: mediaBox.left - box.left + canvas.scrollLeft,
          mediaY: mediaBox.top - box.top + canvas.scrollTop,
          mediaW: mediaBox.width,
          mediaH: mediaBox.height,
          choice,
          open: false,
        },
      ]);
    };
    canvas.addEventListener("click", pick, { capture: true });
    return () => canvas.removeEventListener("click", pick, { capture: true });
  }, [focusEdit, focusNodeId]);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !focusEdit) return;
    const lockNodes = (event: PointerEvent) => {
      if (
        (event.target as HTMLElement).closest(".canvas-node-card") &&
        !(event.target as HTMLElement).closest(".canvas-node-port")
      )
        event.stopPropagation();
    };
    canvas.addEventListener("pointerdown", lockNodes, { capture: true });
    return () =>
      canvas.removeEventListener("pointerdown", lockNodes, { capture: true });
  }, [focusEdit]);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || mode !== "comments") return;
    const placeComment = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (
        target.closest(
          ".canvas-vertical-nav,.canvas-bottom-dock,.canvas-comment-panel,.canvas-comment-marker-wrap,.project-bar,button,input,textarea",
        )
      )
        return;
      const box = canvas.getBoundingClientRect();
      const scale = canvasZoom / 75;
      const x = (event.clientX - box.left + canvas.scrollLeft) / scale;
      const y = (event.clientY - box.top + canvas.scrollTop) / scale;
      setCommentPosition({
        x,
        y,
        viewportX: event.clientX,
        viewportY: event.clientY,
      });
    };
    canvas.addEventListener("click", placeComment, { capture: true });
    return () =>
      canvas.removeEventListener("click", placeComment, { capture: true });
  }, [mode, canvasZoom]);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const down = (event: PointerEvent) => {
      if (
        (event.target as HTMLElement).closest('button[aria-label="智能创作"]')
      )
        focusIconPress.current = {
          x: event.clientX,
          y: event.clientY,
          time: performance.now(),
        };
      else focusIconPress.current = null;
    };
    const up = (event: PointerEvent) => {
      const press = focusIconPress.current;
      focusIconPress.current = null;
      if (
        !press ||
        !(event.target as HTMLElement).closest('button[aria-label="智能创作"]')
      )
        return;
      if (
        performance.now() - press.time > 500 ||
        Math.hypot(event.clientX - press.x, event.clientY - press.y) > 6 ||
        activeNodeId === null
      )
        return;
      setFocusNodeId(activeNodeId);
      setFocusMasterId(activeNodeId);
      setFocusEdit(true);
      setFocusRecenterVisible(true);
      setPromptPopover(null);
      setAddOpen(false);
    };
    canvas.addEventListener("pointerdown", down, { capture: true });
    canvas.addEventListener("pointerup", up, { capture: true });
    return () => {
      canvas.removeEventListener("pointerdown", down, { capture: true });
      canvas.removeEventListener("pointerup", up, { capture: true });
    };
  }, [activeNodeId]);
  const switchMode = (
    next: "focus" | "assets" | "folder" | "history" | "comments" | "account",
  ) => {
    setMode((v) => (v === next ? null : next));
    setCommentPosition(null);
    setAddOpen(false);
    setQuickOpen(false);
    setSelectedTeacher(0);
    setApplied(false);
    setSelection(null);
    if (next === "folder") {
      setFolderDone(true);
      setFolderExpanded(false);
    }
  };
  const handleDockAction = (label: string) => {
    setAddOpen(false);
    setQuickOpen(false);
    if (label === "下载") {
      if (!canvasImage) return;
      const link = document.createElement("a");
      link.href = canvasImage;
      link.download = "画布图片.png";
      link.click();
      return;
    }
    if (label === "预览") {
      if (canvasImage)
        window.open(canvasImage, "_blank", "noopener,noreferrer");
      return;
    }
    if (label === "高清画质") {
      const source = canvasNodes.find((node) => node.id === activeNodeId) || canvasNodes[0];
      if (source) generateFromCanvasNode(source);
      setCanvasTool(label);
      return;
    }
    if (label === "扩图") {
      const source = canvasNodes.find((node) => node.id === activeNodeId) || canvasNodes[0];
      if (!source) return;
      const geometry = getNodeGeometry(source);
      setActiveNodeId(source.id);
      setExpandFrame({ id: source.id, width: geometry.mediaWidth + 48, height: geometry.mediaHeight + 48 });
    }
    if (label === "裁剪") {
      const source = canvasNodes.find((node) => node.id === activeNodeId) || canvasNodes.find((node) => !node.placeholder);
      if (!source) return;
      setActiveNodeId(source.id);
    }
    setCanvasTool(label);
    if (label === "上传") ref.current?.click();
  };
  const generateFromCanvasNode = (source: CanvasNode, keywordOverride?: string) => {
    const nextId = Math.max(0, ...canvasNodes.map((node) => node.id)) + 1;
    const sourceGeometry = getNodeGeometry(source);
    const nextNode: CanvasNode = {
      ...source,
      id: nextId,
      x: source.x + sourceGeometry.cardWidth + 96,
      y: source.y,
      name: `${source.name} · 生成结果`,
      mediaWidth: sourceGeometry.mediaWidth,
      mediaHeight: sourceGeometry.mediaHeight,
      generated: true,
      generationPrompt: (keywordOverride ?? (canvasTool === "移动" ? (canvasPromptTexts[source.id] || "") : canvasToolPromptText)).trim() || "基于原图继续生成",
    };
    setCanvasNodes((nodes) => [...nodes, nextNode]);
    setCanvasLinks((links) => [
      ...links,
      { id: Date.now(), from: source.id, side: "right", to: nextId, targetSide: "left" },
    ]);
    setHdProgress((items) => ({ ...items, [nextId]: 1 }));
    setPromptPopover(null);
    window.requestAnimationFrame(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      canvas.scrollBy({
        left: (nextNode.x - source.x) * (canvasZoom / 75) / 2,
        top: 0,
        behavior: "smooth",
      });
    });
    const timer = window.setInterval(() => {
      setHdProgress((items) => {
        const current = items[nextId];
        if (current === undefined) {
          window.clearInterval(timer);
          return items;
        }
        const next = Math.min(100, current + Math.max(3, Math.round(Math.random() * 9)));
        if (next >= 100) {
          window.clearInterval(timer);
          window.setTimeout(() => setHdProgress((values) => {
            const copy = { ...values };
            delete copy[nextId];
            return copy;
          }), 500);
        }
        return { ...items, [nextId]: next };
      });
    }, 150);
  };
  const cropNode = canvasNodes.find((node) => node.id === activeNodeId);
  const selectedLibraryAsset: Record<number, { name: string; url: string; group: string; description: string }> = {
    1: { name: "冯梦飞", url: "/assets/feng-mengfei.png", group: "教师形象照", description: "将选中的教师头像快速放入当前画布" },
    2: { name: "李颖", url: "/assets/teacher-liying.png", group: "教师形象照", description: "将选中的教师头像快速放入当前画布" },
    3: { name: "憨爸", url: "/assets/teacher-hanba.png", group: "教师形象照", description: "将选中的教师头像快速放入当前画布" },
    4: { name: "临风", url: "/assets/teacher-linfeng.png", group: "教师形象照", description: "将选中的教师头像快速放入当前画布" },
    5: { name: "孩子开学抢跑必备神器", url: "/assets/school-kickoff-poster.png", group: "海报", description: "将选中的海报快速放入当前画布" },
    6: { name: "洋葱学园", url: "/assets/brand-logo-kcle.png", group: "品牌 Logo", description: "将选中的品牌 Logo 快速放入当前画布" },
  };
  const activeLibraryAsset = selectedLibraryAsset[selectedTeacher];
  const redrawNode =
    canvasNodes.find((node) => node.id === activeNodeId) || canvasNodes[0];
  const promptOwnerId =
    focusEdit && focusNodeId !== null ? focusNodeId : activeNodeId;
  const focusChoices = [
    { name: "白色绒毛质地", width: 116, height: 46, dx: -58, dy: -8 },
    { name: "卡通头部", width: 142, height: 126, dx: -71, dy: -88 },
    { name: "卡通动物角色", width: 196, height: 254, dx: -98, dy: -174 },
    { name: "卡通熊手臂", width: 92, height: 142, dx: -46, dy: -72 },
  ];
  const getFocusPickBox = (pick: (typeof focusPicks)[number]) => {
    const choice = focusChoices[pick.choice];
    const width = Math.min(choice.width, pick.mediaW),
      height = Math.min(choice.height, pick.mediaH);
    return {
      choice,
      width,
      height,
      left: Math.max(
        pick.mediaX,
        Math.min(pick.anchorX + choice.dx, pick.mediaX + pick.mediaW - width),
      ),
      top: Math.max(
        pick.mediaY,
        Math.min(pick.anchorY + choice.dy, pick.mediaY + pick.mediaH - height),
      ),
    };
  };
  const getNearestLinkSides = (from: CanvasNode, to: CanvasNode) =>
    to.x >= from.x
      ? { side: "right" as const, targetSide: "left" as const }
      : { side: "left" as const, targetSide: "right" as const };
  const groupedBounds = canvasGroups.flatMap((group) => {
    const nodes = canvasNodes.filter((node) => group.nodeIds.includes(node.id));
    if (nodes.length < 2) return [];
    const bounds = nodes.map((node) => {
      const geometry = getNodeGeometry(node);
      const left = CANVAS_WORLD_CENTER + node.x - geometry.cardWidth / 2;
      const top = CANVAS_WORLD_CENTER + node.y - geometry.cardHeight / 2;
      return { left, top, right: left + geometry.cardWidth, bottom: top + geometry.cardHeight };
    });
    const padding = 18;
    const left = Math.min(...bounds.map((bound) => bound.left)) - padding;
    const top = Math.min(...bounds.map((bound) => bound.top)) - padding;
    return [{
      ...group,
      left,
      top,
      width: Math.max(...bounds.map((bound) => bound.right)) - left + padding,
      height: Math.max(...bounds.map((bound) => bound.bottom)) - top + padding,
    }];
  });

  return (
    <section
      className={`canvas-page figma-canvas-page ${canvasNodes.length === 0 ? "canvas-empty-state" : "canvas-populated-state"} ${mode === "comments" ? "canvas-comments-mode" : ""} ${canvasTool === "裁剪" && cropNode ? "canvas-crop-mode" : ""}`}
      onPointerDownCapture={(e) => {
        if (!pendingLink) return;
        const hit = (e.target as HTMLElement).closest<HTMLElement>(
          "[data-node-id]",
        );
        const targetId = hit ? Number(hit.dataset.nodeId) : undefined;
        if (!targetId || targetId === pendingLink.from) return;
        const rect = hit!.getBoundingClientRect();
        const targetSide: eastWest =
          e.clientX < rect.left + rect.width / 2 ? "left" : "right";
        setCanvasLinks((v) => [
          ...v,
          {
            id: Date.now(),
            from: pendingLink.from,
            side: pendingLink.side,
            to: targetId,
            targetSide,
          },
        ]);
        setPendingLink(null);
        setLinkDraft(null);
        e.preventDefault();
        e.stopPropagation();
      }}
      onClickCapture={(e) => {
        const port = (e.target as HTMLElement).closest<HTMLElement>(
          ".canvas-node-port",
        );
        if (port) {
          const node = port.closest<HTMLElement>("[data-node-id]");
          if (!node) return;
          const side: eastWest = port.classList.contains("left")
            ? "left"
            : "right";
          const rect = port.getBoundingClientRect();
          const point = getCanvasPoint(
            rect.left + rect.width / 2,
            rect.top + rect.height / 2,
          );
          setPendingLink({ from: Number(node.dataset.nodeId), side });
          setLinkDraft({
            from: Number(node.dataset.nodeId),
            side,
            x: point.x,
            y: point.y,
          });
          return;
        }
        if (
          pendingLink &&
          !(e.target as HTMLElement).closest("[data-node-id]")
        ) {
          setPendingLink(null);
          setLinkDraft(null);
        }
      }}
    >
      <header className="project-bar">
        <button className="project-logo" onClick={onBack}>
          <span className="canvas-brand-mark">
            <img src="/assets/brand-logo.svg" />
          </span>
        </button>
        <div>
          <strong>{projectTitle}</strong>
          <small>上次修改于 刚刚</small>
        </div>
      </header>
      <div
        ref={canvasRef}
        className="figma-infinite-canvas"
        style={{ "--canvas-scale": canvasZoom / 75 } as React.CSSProperties}
        onScroll={() => {
          if ((focusEdit || referenceSelect) && !suppressFocusScroll.current)
            setFocusRecenterVisible(true);
        }}
        onClick={() => {
          setImageMenu(null);
          setPromptPopover(null);
        }}
        onContextMenuCapture={(event) => {
          const point = getCanvasPoint(event.clientX, event.clientY);
          const group = [...groupedBounds].reverse().find((bound) =>
            point.x >= bound.left &&
            point.x <= bound.left + bound.width &&
            point.y >= bound.top &&
            point.y <= bound.top + bound.height,
          );
          if (!group) return;
          event.preventDefault();
          event.stopPropagation();
          setContextGroupId(group.id);
          setActiveGroupId(group.id);
          setActiveNodeId(null);
        }}
        onDragOver={(event) => {
          if (event.dataTransfer.types.includes("application/x-canvas-asset")) {
            event.preventDefault();
            setDragStart(null);
            setSelection(null);
          }
        }}
        onDrop={(event) => {
          const raw = event.dataTransfer.getData("application/x-canvas-asset");
          if (!raw) return;
          event.preventDefault();
          try {
            const asset = JSON.parse(raw) as { name: string; url: string };
            const point = getCanvasPoint(event.clientX, event.clientY);
            const id = Date.now();
            setCanvasNodes((nodes) => [
              ...nodes,
              {
                id,
                url: asset.url,
                name: asset.name,
                x: point.x - CANVAS_WORLD_CENTER,
                y: point.y - CANVAS_WORLD_CENTER,
              },
            ]);
            setCanvasImage(asset.url);
            setActiveNodeId(id);
          } catch {}
        }}
        onMouseDown={(e) => {
          if (
            canvasNodes.length === 0 ||
            (e.target as HTMLElement).closest(
              "button,input,textarea,nav,.canvas-prompt,.canvas-add-popover,.folder-result,.canvas-node-card,.canvas-group-frame,.asset-library-panel,.figma-history-panel",
            )
          )
            return;
          const p = getCanvasPoint(e.clientX, e.clientY);
          selectionOrigin.current = p;
          selectionPointer.current = p;
          if (selectionHoldTimer.current)
            window.clearTimeout(selectionHoldTimer.current);
          selectionHoldTimer.current = null;
          setDragStart(p);
          setSelection({ x: p.x, y: p.y, width: 0, height: 0 });
        }}
        onMouseMove={(e) => {
          const { x, y } = getCanvasPoint(e.clientX, e.clientY);
          selectionPointer.current = { x, y };
          if (linkDraft) {
            setLinkDraft((v) => v && { ...v, x, y });
            return;
          }
          if (!dragStart) return;
          setSelection({
            x: Math.min(x, dragStart.x),
            y: Math.min(y, dragStart.y),
            width: Math.abs(x - dragStart.x),
            height: Math.abs(y - dragStart.y),
          });
        }}
        onMouseUp={(e) => {
          if (selectionHoldTimer.current) {
            window.clearTimeout(selectionHoldTimer.current);
            selectionHoldTimer.current = null;
          }
          selectionOrigin.current = null;
          selectionPointer.current = null;
          if (linkDraft) {
            const hit = (e.target as HTMLElement).closest<HTMLElement>(
              "[data-node-id]",
            );
            const targetId = hit ? Number(hit.dataset.nodeId) : undefined;
            if (targetId && targetId !== linkDraft.from) {
              const rect = hit!.getBoundingClientRect();
              const targetSide: eastWest =
                e.clientX < rect.left + rect.width / 2 ? "left" : "right";
              setCanvasLinks((v) => [
                ...v,
                {
                  id: Date.now(),
                  from: linkDraft.from,
                  side: linkDraft.side,
                  to: targetId,
                  targetSide,
                },
              ]);
            } else if (!targetId) {
              const { x: dropX, y: dropY } = getCanvasPoint(
                e.clientX,
                e.clientY,
              );
              const id = Date.now();
              const from = canvasNodes.find(
                (node) => node.id === linkDraft.from,
              );
              const x = dropX - CANVAS_WORLD_CENTER,
                y = dropY - CANVAS_WORLD_CENTER;
              setCanvasNodes((nodes) => [
                ...nodes,
                { id, url: "", x, y, name: "点击上传图片", placeholder: true },
              ]);
              setCanvasLinks((links) => [
                ...links,
                {
                  id: id + 1,
                  from: linkDraft.from,
                  side: linkDraft.side,
                  to: id,
                  targetSide: (from?.x ?? 0) <= x ? "left" : "right",
                },
              ]);
            }
            setLinkDraft(null);
          }
          if (selection && dragStart) {
            const overlaps = canvasNodes.some((node) => {
              const geometry = getNodeGeometry(node);
              const left = CANVAS_WORLD_CENTER + node.x - geometry.cardWidth / 2,
                top = CANVAS_WORLD_CENTER + node.y - geometry.cardHeight / 2,
                right = left + geometry.cardWidth,
                bottom = top + geometry.cardHeight;
              return (
                selection.x < right &&
                selection.x + selection.width > left &&
                selection.y < bottom &&
                selection.y + selection.height > top
              );
            });
            if (!overlaps) setSelection(null);
          }
          setDragStart(null);
        }}
        onMouseLeave={() => {
          if (selectionHoldTimer.current) {
            window.clearTimeout(selectionHoldTimer.current);
            selectionHoldTimer.current = null;
          }
          selectionOrigin.current = null;
          selectionPointer.current = null;
          setDragStart(null);
          setLinkDraft(null);
        }}
        onDoubleClick={(e) => {
          const box = e.currentTarget.getBoundingClientRect();
          setSelection(null);
          setAddPosition({
            x: Math.max(8, Math.min(e.clientX - box.left, box.width - 256)),
            y: Math.max(8, Math.min(e.clientY - box.top, box.height - 430)),
          });
          setAddOpen(true);
          setMode(null);
          setQuickOpen(false);
        }}
      >
        {canvasNodes.length === 0 && !addOpen && mode === null && (
          <div className="canvas-home-guide">
            <div className="canvas-home-title">
              <span>
                <img src="/assets/canvas-dock-move.svg" />
                双击
              </span>
              <strong>画布自由生成</strong>
            </div>
            <div className="canvas-home-actions">
              <button onClick={() => setCanvasTool("局部重绘")}>
                <img src="/assets/canvas-dock-redraw.svg" />
                局部重绘
              </button>
              <button onClick={() => setCanvasTool("擦除内容")}>
                <img src="/assets/canvas-dock-erase.svg" />
                擦除内容
              </button>
              <button onClick={() => setCanvasTool("尺寸修改")}>
                <img src="/assets/figma-resize.svg" />
                尺寸修改
              </button>
              <button onClick={() => setCanvasTool("高清")}>
                <img src="/assets/canvas-dock-hd.svg" />
                画质增强
              </button>
            </div>
          </div>
        )}
        {canvasLinks.length > 0 && !(mode === "folder" && folderDone) && (
          <svg className="canvas-link-actions">
            {canvasLinks.map((link) => {
              const from = canvasNodes.find((n) => n.id === link.from),
                to = canvasNodes.find((n) => n.id === link.to);
              if (!from || !to) return null;
              const nearest = getNearestLinkSides(from, to);
              const fromGeometry = getNodeGeometry(from);
              const toGeometry = getNodeGeometry(to);
              const sx = CANVAS_WORLD_CENTER + from.x + (nearest.side === "left" ? -fromGeometry.mediaWidth / 2 : fromGeometry.mediaWidth / 2),
                sy = fromGeometry.centerY;
              const ex =
                  CANVAS_WORLD_CENTER + to.x + (nearest.targetSide === "left" ? -toGeometry.mediaWidth / 2 : toGeometry.mediaWidth / 2),
                ey = toGeometry.centerY;
              const linkDistance = Math.hypot(ex - sx, ey - sy);
              const horizontalDistance = Math.abs(ex - sx);
              const curve = Math.max(
                54,
                Math.min(188, linkDistance * 0.3 + horizontalDistance * 0.12),
              );
              const d = `M ${sx} ${sy} C ${sx + (nearest.side === "left" ? -curve : curve)} ${sy}, ${ex + (nearest.targetSide === "left" ? -curve : curve)} ${ey}, ${ex} ${ey}`;
              const glowStart = Math.min(sx, ex) - 180;
              const glowEnd = Math.max(sx, ex) + 180;
              const glowWidth = Math.max(120, Math.abs(ex - sx) * 0.24);
              const active =
                activeNodeId === from.id ||
                activeNodeId === to.id ||
                selectedNodeIds.includes(from.id) ||
                selectedNodeIds.includes(to.id);
              return (
                <g
                  className={`canvas-link-hit ${active ? "selected" : ""}`}
                  key={link.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    setCanvasLinks((v) =>
                      v.filter((item) => item.id !== link.id),
                    );
                  }}
                >
                  <defs>
                    <linearGradient
                      id={`canvas-link-glow-${link.id}`}
                      gradientUnits="userSpaceOnUse"
                      x1={glowStart}
                      y1={sy}
                      x2={glowStart + glowWidth}
                      y2={ey}
                    >
                      <stop offset="0" stopColor="#ffffff" stopOpacity="0" />
                      <stop offset="0.34" stopColor="#ffffff" stopOpacity="0.2" />
                      <stop offset="0.5" stopColor="#ffffff" stopOpacity="1" />
                      <stop offset="0.66" stopColor="#ffffff" stopOpacity="0.2" />
                      <stop offset="1" stopColor="#ffffff" stopOpacity="0" />
                      <animate
                        attributeName="x1"
                        from={glowStart}
                        to={glowEnd}
                        dur="1.65s"
                        repeatCount="indefinite"
                      />
                      <animate
                        attributeName="x2"
                        from={glowStart + glowWidth}
                        to={glowEnd + glowWidth}
                        dur="1.65s"
                        repeatCount="indefinite"
                      />
                    </linearGradient>
                  </defs>
                  <path className="visible-link" d={d} />
                  <path
                    className="glow-link"
                    d={d}
                    stroke={`url(#canvas-link-glow-${link.id})`}
                  />
                  <path className="hit-link" d={d} />
                  <circle cx={(sx + ex) / 2} cy={(sy + ey) / 2} r="12" />
                  <text x={(sx + ex) / 2} y={(sy + ey) / 2}>
                    ×
                  </text>
                </g>
              );
            })}
          </svg>
        )}
        {canvasNodes.length > 0 && !(mode === "folder" && folderDone) && (
          <>
            <svg className="canvas-links" aria-hidden="true">
              {canvasLinks.map((link) => {
                const from = canvasNodes.find((n) => n.id === link.from);
                const to = canvasNodes.find((n) => n.id === link.to);
                if (!from) return null;
                const nearest = to ? getNearestLinkSides(from, to) : { side: link.side, targetSide: link.targetSide };
                const fromGeometry = getNodeGeometry(from);
                const toGeometry = to ? getNodeGeometry(to) : null;
                const sx = CANVAS_WORLD_CENTER + from.x + (nearest.side === "left" ? -fromGeometry.mediaWidth / 2 : fromGeometry.mediaWidth / 2),
                  sy = fromGeometry.centerY;
                const ex = to
                    ? CANVAS_WORLD_CENTER + to.x + (nearest.targetSide === "left" ? -(toGeometry?.mediaWidth ?? 298) / 2 : (toGeometry?.mediaWidth ?? 298) / 2)
                    : link.endX,
                  ey = to ? toGeometry!.centerY : link.endY;
                return (
                  <path
                    key={link.id}
                    d={`M ${sx} ${sy} C ${sx + (nearest.side === "left" ? -90 : 90)} ${sy}, ${ex + (nearest.targetSide === "left" ? -90 : 90)} ${ey}, ${ex} ${ey}`}
                  />
                );
              })}
              {linkDraft &&
                (() => {
                  const from = canvasNodes.find((n) => n.id === linkDraft.from);
                  if (!from) return null;
                  const geometry = getNodeGeometry(from);
                  const sx = CANVAS_WORLD_CENTER + from.x + (linkDraft.side === "left" ? -geometry.mediaWidth / 2 : geometry.mediaWidth / 2),
                    sy = geometry.centerY;
                  return (
                    <path
                      className="draft"
                      d={`M ${sx} ${sy} C ${sx + (linkDraft.side === "left" ? -90 : 90)} ${sy}, ${linkDraft.x} ${linkDraft.y}, ${linkDraft.x} ${linkDraft.y}`}
                    />
                  );
                })()}
            </svg>
            <div className="canvas-node-layer">
              {groupedBounds.map((group) => (
                <div
                  className={`canvas-group-frame ${activeGroupId === group.id ? "selected" : ""}`}
                  style={{
                    left: `${group.left}px`,
                    top: `${group.top}px`,
                    width: `${group.width}px`,
                    height: `${group.height}px`,
                  }}
                  key={group.id}
                  role="group"
                  aria-label={group.name}
                  onPointerDown={(event) => {
                    if (event.button !== 0) return;
                    event.preventDefault();
                    event.stopPropagation();
                    event.currentTarget.setPointerCapture(event.pointerId);
                    const origins = Object.fromEntries(
                      canvasNodes
                        .filter((node) => group.nodeIds.includes(node.id))
                        .map((node) => [node.id, { x: node.x, y: node.y }]),
                    );
                    setActiveGroupId(group.id);
                    setActiveNodeId(null);
                    setImageDrag({
                      id: group.nodeIds[0],
                      pointerId: event.pointerId,
                      startX: event.clientX,
                      startY: event.clientY,
                      origins,
                    });
                  }}
                  onPointerMove={(event) => {
                    if (!imageDrag || imageDrag.pointerId !== event.pointerId || imageDrag.id !== group.nodeIds[0]) return;
                    event.preventDefault();
                    event.stopPropagation();
                    const dx = (event.clientX - imageDrag.startX) / (canvasZoom / 75);
                    const dy = (event.clientY - imageDrag.startY) / (canvasZoom / 75);
                    setCanvasNodes((nodes) => nodes.map((node) => {
                      const origin = imageDrag.origins[node.id];
                      return origin ? { ...node, x: origin.x + dx, y: origin.y + dy } : node;
                    }));
                  }}
                  onPointerUp={(event) => {
                    if (imageDrag?.pointerId !== event.pointerId || imageDrag.id !== group.nodeIds[0]) return;
                    event.stopPropagation();
                    event.currentTarget.releasePointerCapture(event.pointerId);
                    setImageDrag(null);
                  }}
                  onClick={(event) => {
                    event.stopPropagation();
                    setActiveGroupId(group.id);
                    setActiveNodeId(null);
                  }}
                >
                  <div
                    className="canvas-group-name"
                    onPointerDown={(event) => event.stopPropagation()}
                    onDoubleClick={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      setGroupNameDraft(group.name);
                      setGroupNameEditing(group.id);
                    }}
                  >
                    {groupNameEditing === group.id ? (
                      <input
                        autoFocus
                        value={groupNameDraft}
                        onChange={(event) => setGroupNameDraft(event.target.value)}
                        onBlur={() => {
                          const name = groupNameDraft.trim() || "未命名组";
                          setCanvasGroups((groups) => groups.map((item) => item.id === group.id ? { ...item, name } : item));
                          setGroupNameEditing(null);
                        }}
                        onKeyDown={(event) => {
                          if (event.key === "Enter") event.currentTarget.blur();
                          if (event.key === "Escape") {
                            setGroupNameDraft(group.name);
                            setGroupNameEditing(null);
                          }
                        }}
                        onPointerDown={(event) => event.stopPropagation()}
                      />
                    ) : (
                      <span>{group.name}</span>
                    )}
                  </div>
                  {contextGroupId === group.id && (
                    <button
                      className="canvas-ungroup-button"
                      onPointerDown={(event) => event.stopPropagation()}
                      onClick={(event) => {
                        event.stopPropagation();
                        setCanvasGroups((groups) => groups.filter((item) => item.id !== group.id));
                        setContextGroupId(null);
                        setActiveGroupId(null);
                      }}
                    >
                      解组
                    </button>
                  )}
                </div>
              ))}
              {canvasNodes.map((node) => (
                <article
                  data-node-id={node.id}
                  className={`canvas-node-card ${node.placeholder ? "is-placeholder" : ""} ${imageDrag?.origins[node.id] ? "is-dragging" : ""} ${canvasGroups.some((group) => group.nodeIds.includes(node.id)) ? "is-grouped" : ""} ${node.name.endsWith("· 高清") ? "is-hd-result" : ""} ${canvasTool === "扩图" && expandFrame?.id === node.id ? "is-expand-active" : ""}`}
                  style={{
                    width: `${getNodeGeometry(node).cardWidth}px`,
                    height: `${getNodeGeometry(node).cardHeight}px`,
                    "--node-media-width": `${getNodeGeometry(node).mediaWidth}px`,
                    "--node-media-height": `${getNodeGeometry(node).mediaHeight}px`,
                    transform: `translate(calc(-50% + ${node.x}px),calc(-50% + ${node.y}px))`,
                  } as React.CSSProperties}
                  key={node.id}
                  onPointerDown={(e) => {
                    if (
                      e.button !== 0 ||
                      (e.target as HTMLElement).closest(
                        ".canvas-node-port,.canvas-placeholder-upload,.canvas-expand-frame,.canvas-expand-handle",
                      )
                    )
                      return;
                    e.preventDefault();
                    e.stopPropagation();
                    setActiveGroupId(null);
                    setContextGroupId(null);
                    e.currentTarget.setPointerCapture(e.pointerId);
                    const dragIds =
                      selection && selectedNodeIds.length > 1 && selectedNodeIds.includes(node.id)
                        ? selectedNodeIds
                        : [node.id];
                    const origins = Object.fromEntries(
                      canvasNodes
                        .filter((item) => dragIds.includes(item.id))
                        .map((item) => [item.id, { x: item.x, y: item.y }]),
                    );
                    setImageDrag({
                      id: node.id,
                      pointerId: e.pointerId,
                      startX: e.clientX,
                      startY: e.clientY,
                      origins,
                    });
                  }}
                  onPointerMove={(e) => {
                    if (
                      !imageDrag ||
                      imageDrag.id !== node.id ||
                      imageDrag.pointerId !== e.pointerId
                    )
                      return;
                    e.preventDefault();
                    e.stopPropagation();
                    const dx = (e.clientX - imageDrag.startX) / (canvasZoom / 75);
                    const dy = (e.clientY - imageDrag.startY) / (canvasZoom / 75);
                    setCanvasNodes((v) =>
                      v.map((n) => {
                        const origin = imageDrag.origins[n.id];
                        return origin ? { ...n, x: origin.x + dx, y: origin.y + dy } : n;
                      }),
                    );
                  }}
                  onPointerUp={(e) => {
                    if (imageDrag?.id !== node.id) return;
                    e.stopPropagation();
                    e.currentTarget.releasePointerCapture(e.pointerId);
                    setImageDrag(null);
                  }}
                  onDoubleClick={(e) => e.stopPropagation()}
                >
                  <button
                    className="canvas-node-port left"
                    aria-label="从左侧连接"
                    onPointerDown={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                        const point = getCanvasPoint(e.clientX, e.clientY);
                        setLinkDraft({
                          from: node.id,
                          side: "left",
                          x: point.x,
                          y: point.y,
                      });
                    }}
                  >
                    ＋
                  </button>
                  <div
                    className="canvas-node-media"
                    onContextMenu={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setCanvasNodes((v) => v.filter((n) => n.id !== node.id));
                    }}
                  >
                    {hdProgress[node.id] !== undefined ? (
                      <div className="canvas-hd-generating"><b>✦</b><span>生成中 {hdProgress[node.id]}%</span><i style={{width:`${hdProgress[node.id]}%`}} /></div>
                    ) : node.placeholder ? (
                      <button
                        className="canvas-placeholder-upload"
                        onClick={(e) => {
                          e.stopPropagation();
                          setUploadTargetNodeId(node.id);
                          ref.current?.click();
                        }}
                      >
                        <img src="/assets/figma-image-placeholder.svg" />
                        <span>点击上传图片</span>
                      </button>
                    ) : (
                      <img
                        src={node.url}
                        draggable={false}
                        onLoad={(event) => updateNodeImageSize(node.id, event.currentTarget.naturalWidth, event.currentTarget.naturalHeight)}
                      />
                    )}
                    {node.generated && hdProgress[node.id] === undefined && (
                      <>
                        <button
                          className="canvas-generated-copy"
                          aria-label="查看并复制生成关键词"
                          onPointerDown={(event) => event.stopPropagation()}
                          onClick={(event) => {
                            event.stopPropagation();
                            setKeywordPopoverNodeId((current) => current === node.id ? null : node.id);
                          }}
                        >
                          <img src="/assets/figma-model-unified.svg" />
                        </button>
                        {keywordPopoverNodeId === node.id && (
                          <aside className="canvas-keyword-popover" onPointerDown={(event) => event.stopPropagation()} onClick={(event) => event.stopPropagation()}>
                            <img src={node.url} alt="生成图片缩略图" />
                            <div>
                              <small>生成关键词</small>
                              <p>{node.generationPrompt}</p>
                            </div>
                            <button
                              onClick={async () => {
                                await navigator.clipboard.writeText(node.generationPrompt || "");
                                setCopiedKeywordNodeId(node.id);
                                window.setTimeout(() => setCopiedKeywordNodeId(null), 1200);
                              }}
                            >{copiedKeywordNodeId === node.id ? "已复制" : "一键复制"}</button>
                          </aside>
                        )}
                      </>
                    )}
                    {!node.placeholder && ["局部重绘", "擦除"].includes(canvasTool) && (
                      <svg
                        className={`canvas-redraw-layer redraw-mode-${redrawMode} ${canvasTool === "擦除" ? "canvas-erase-editor" : ""}`}
                        viewBox={`0 0 ${getNodeGeometry(node).mediaWidth} ${getNodeGeometry(node).mediaHeight}`}
                        onPointerDown={(event) => {
                          event.preventDefault(); event.stopPropagation(); event.currentTarget.setPointerCapture(event.pointerId);
                          const box=event.currentTarget.getBoundingClientRect();
                          const point={x:(event.clientX-box.left)/box.width*getNodeGeometry(node).mediaWidth,y:(event.clientY-box.top)/box.height*getNodeGeometry(node).mediaHeight};
                          setActiveRedrawStroke({nodeId:node.id,size:redrawBrushSize,kind:redrawMode === "框选" ? "box" : redrawMode === "橡皮" ? "erase" : "brush",points:redrawMode === "框选"?[point,point]:[point]}); setRedrawCursor({nodeId:node.id,...point});
                        }}
                        onPointerMove={(event) => {
                          const box=event.currentTarget.getBoundingClientRect();
                          const point={x:(event.clientX-box.left)/box.width*getNodeGeometry(node).mediaWidth,y:(event.clientY-box.top)/box.height*getNodeGeometry(node).mediaHeight};
                          setRedrawCursor({nodeId:node.id,...point});
                          if(event.buttons===1) setActiveRedrawStroke((stroke)=>stroke&&stroke.nodeId===node.id?{...stroke,points:stroke.kind==="box"?[stroke.points[0],point]:[...stroke.points,point]}:stroke);
                        }}
                        onPointerUp={(event) => {
                          event.stopPropagation();
                          setActiveRedrawStroke((stroke)=>{if(stroke&&stroke.points.length>1)setRedrawStrokes((items)=>{setRedrawUndoStack((history)=>[...history,items]);setRedrawRedoStack([]);return [...items,stroke];});return null;});
                        }}
                        onPointerLeave={() => setRedrawCursor(null)}
                      >
                        <defs>
                          <pattern id={`erase-checker-${node.id}`} width="16" height="16" patternUnits="userSpaceOnUse"><rect width="16" height="16" style={{fill:"#f1f1f1",stroke:"none"}}/><rect width="8" height="8" style={{fill:"#c9c9c9",stroke:"none"}}/><rect x="8" y="8" width="8" height="8" style={{fill:"#c9c9c9",stroke:"none"}}/></pattern>
                          {redrawStrokes.filter((stroke)=>stroke.nodeId===node.id&&stroke.kind!=="erase").map((_,drawIndex)=>{
                            const nodeActions=redrawStrokes.filter((stroke)=>stroke.nodeId===node.id);
                            const actualIndex=nodeActions.findIndex((stroke,index)=>stroke.kind!=="erase"&&nodeActions.filter((item,j)=>j<=index&&item.kind!=="erase").length===drawIndex+1);
                            return <mask key={drawIndex} id={`redraw-mask-${node.id}-${drawIndex}`} maskUnits="userSpaceOnUse" x="0" y="0" width={getNodeGeometry(node).mediaWidth} height={getNodeGeometry(node).mediaHeight}><rect className="redraw-mask-base" width="100%" height="100%" />{nodeActions.slice(actualIndex+1).filter((stroke)=>stroke.kind==="erase").map((stroke,index)=><polyline className="redraw-erase-path" key={index} points={stroke.points.map((point)=>`${point.x},${point.y}`).join(" ")} strokeWidth={stroke.size} />)}{activeRedrawStroke?.nodeId===node.id&&activeRedrawStroke.kind==="erase"&&<polyline className="redraw-erase-path" points={activeRedrawStroke.points.map((point)=>`${point.x},${point.y}`).join(" ")} strokeWidth={activeRedrawStroke.size} />}</mask>;
                          })}
                        </defs>
                        <g className="redraw-stroke-composite">
                          {(()=>{let drawIndex=0;return redrawStrokes.filter((stroke)=>stroke.nodeId===node.id).map((stroke,index)=>{if(stroke.kind==="erase")return null;const mask=`url(#redraw-mask-${node.id}-${drawIndex++})`;const checker=`url(#erase-checker-${node.id})`;return stroke.kind==="box"?<rect key={index} mask={mask} style={canvasTool==="擦除"?{fill:checker}:undefined} x={Math.min(stroke.points[0].x,stroke.points[1].x)} y={Math.min(stroke.points[0].y,stroke.points[1].y)} width={Math.abs(stroke.points[1].x-stroke.points[0].x)} height={Math.abs(stroke.points[1].y-stroke.points[0].y)} />:<polyline key={index} mask={mask} style={canvasTool==="擦除"?{stroke:checker}:undefined} points={stroke.points.map((point)=>`${point.x},${point.y}`).join(" ")} strokeWidth={stroke.size} />;});})()}
                          {activeRedrawStroke?.nodeId===node.id&&activeRedrawStroke.kind!=="erase"&&(activeRedrawStroke.kind==="box"?<rect style={canvasTool==="擦除"?{fill:`url(#erase-checker-${node.id})`}:undefined} x={Math.min(activeRedrawStroke.points[0].x,activeRedrawStroke.points[1].x)} y={Math.min(activeRedrawStroke.points[0].y,activeRedrawStroke.points[1].y)} width={Math.abs(activeRedrawStroke.points[1].x-activeRedrawStroke.points[0].x)} height={Math.abs(activeRedrawStroke.points[1].y-activeRedrawStroke.points[0].y)} />:<polyline style={canvasTool==="擦除"?{stroke:`url(#erase-checker-${node.id})`}:undefined} points={activeRedrawStroke.points.map((point)=>`${point.x},${point.y}`).join(" ")} strokeWidth={activeRedrawStroke.size} />)}
                        </g>
                        {redrawMode!=="框选"&&redrawCursor?.nodeId===node.id&&<circle className="redraw-cursor-ring" cx={redrawCursor.x} cy={redrawCursor.y} r={redrawBrushSize/2} />}
                      </svg>
                    )}
                    {!node.placeholder && canvasTool === "扩图" && expandFrame?.id === node.id && (
                      <div className="canvas-expand-frame" style={{width:expandFrame.width,height:expandFrame.height}}>
                        {["nw","n","ne","e","se","s","sw","w"].map((axis)=><button key={axis} className={`canvas-expand-handle ${axis}`} aria-label={`调整${axis}边界`} onPointerDown={(event)=>{event.preventDefault();event.stopPropagation();event.currentTarget.setPointerCapture(event.pointerId);setExpandResize({pointerId:event.pointerId,startX:event.clientX,startY:event.clientY,width:expandFrame.width,height:expandFrame.height,axis});}} onPointerMove={(event)=>{if(!expandResize||expandResize.pointerId!==event.pointerId)return;event.preventDefault();event.stopPropagation();const dx=(event.clientX-expandResize.startX)/(canvasZoom/75),dy=(event.clientY-expandResize.startY)/(canvasZoom/75);const horizontal=expandResize.axis.includes("e")?dx:expandResize.axis.includes("w")?-dx:0;const vertical=expandResize.axis.includes("s")?dy:expandResize.axis.includes("n")?-dy:0;setExpandFrame((frame)=>frame?{...frame,width:Math.max(getNodeGeometry(node).mediaWidth,expandResize.width+horizontal*2),height:Math.max(getNodeGeometry(node).mediaHeight,expandResize.height+vertical*2)}:frame);}} onPointerUp={(event)=>{event.preventDefault();event.stopPropagation();setExpandResize(null);}} />)}
                      </div>
                    )}
                  </div>
                  <button
                    className="canvas-node-port right"
                    aria-label="从右侧连接"
                    onPointerDown={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                        const point = getCanvasPoint(e.clientX, e.clientY);
                        setLinkDraft({
                          from: node.id,
                          side: "right",
                          x: point.x,
                          y: point.y,
                      });
                    }}
                  >
                    ＋
                  </button>
                  <footer>
                    <strong>{node.name}</strong>
                    <small>
                      {node.placeholder ? "等待添加内容" : "上次修改于 刚刚"}
                    </small>
                  </footer>
                </article>
              ))}
            </div>
          </>
        )}
        {focusEdit &&
          focusPicks.map((pick) => {
            const box = getFocusPickBox(pick);
            return (
              <div
                className="canvas-focus-pick"
                key={pick.id}
                style={{
                  left: box.left,
                  top: box.top,
                  width: box.width,
                  height: box.height,
                }}
              >
                <button
                  className="canvas-focus-label"
                  onClick={(e) => {
                    e.stopPropagation();
                    setFocusPicks((items) =>
                      items.map((item) =>
                        item.id === pick.id
                          ? { ...item, open: !item.open }
                          : item,
                      ),
                    );
                  }}
                >
                  <span>✦</span>
                  {box.choice.name}
                  <b>⌄</b>
                </button>
                <button
                  className="canvas-focus-remove"
                  aria-label="删除选区"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeFocusPick(pick.id);
                  }}
                >
                  ×
                </button>
                {pick.open && (
                  <div
                    className="canvas-focus-options"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {focusChoices.map((choice, index) => (
                      <button
                        className={index === pick.choice ? "active" : ""}
                        key={choice.name}
                        onClick={() =>
                          setFocusPicks((items) =>
                            items.map((item) =>
                              item.id === pick.id
                                ? { ...item, choice: index, open: false }
                                : item,
                            ),
                          )
                        }
                      >
                        {choice.name}
                        {index === pick.choice && <i />}
                      </button>
                    ))}
                  </div>
                )}
                <i />
                <i />
                <i />
                <i />
              </div>
            );
          })}
        {(focusEdit || referenceSelect) && (
          <section className="canvas-focus-toast">
            <div>
              <strong>{referenceSelect ? "请选择参考" : "焦点编辑"}</strong>
              <small>{referenceSelect ? "点击其他图片建立参考连线" : "点击其他节点以提取元素"}</small>
            </div>
            {focusRecenterVisible && (
              <button
                className="canvas-focus-target"
                aria-label="回到主图中心"
                onClick={() => {
                  const master = canvasNodes.find((node) => node.id === focusMasterId) || canvasNodes[0];
                  const canvas = canvasRef.current;
                  if (!master || !canvas) return;
                  const scale = canvasZoom / 75;
                  suppressFocusScroll.current = true;
                  canvas.scrollTo({
                    left: (CANVAS_WORLD_CENTER + master.x) * scale - canvas.clientWidth / 2,
                    top: (CANVAS_WORLD_CENTER + master.y) * scale - canvas.clientHeight / 2,
                    behavior: "auto",
                  });
                  setFocusRecenterVisible(false);
                  window.setTimeout(() => { suppressFocusScroll.current = false; }, 100);
                }}
              >
                <img src="/assets/focus-recenter.svg" />
              </button>
            )}
            <button onClick={() => {
              if (referenceSelect) {
                setReferenceSelect(false);
                setFocusMasterId(null);
              } else exitFocusEdit();
            }}>退出</button>
          </section>
        )}
        {imageMenu && (
          <div
            className="canvas-image-menu"
            style={{ left: imageMenu.x, top: imageMenu.y }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => {
                setCanvasImage(null);
                setImageMenu(null);
                setCanvasTool("上传");
              }}
            >
              删除图片
            </button>
          </div>
        )}
        {promptOwnerId !== null &&
          imageDrag === null &&
          canvasTool === "移动" &&
          (() => {
            const node = canvasNodes.find((item) => item.id === promptOwnerId);
            if (!node || (mode === "folder" && folderDone)) return null;
            return (
              <section
                className="canvas-node-prompt"
                style={{
                  left: (CANVAS_WORLD_CENTER + node.x) * (canvasZoom / 75),
                  top:
                    (CANVAS_WORLD_CENTER + node.y + getNodeGeometry(node).cardHeight / 2) *
                      (canvasZoom / 75) +
                    14,
                }}
                onPointerDown={(e) => e.stopPropagation()}
                onClick={(e) => e.stopPropagation()}
              >
                <div className="canvas-node-prompt-tools">
                  <button aria-label="智能创作">
                    <img src="/assets/canvas-smart.svg" />
                  </button>
                  <i />
                  <button
                    aria-label="添加素材"
                    onClick={() => {
                      setFocusMasterId(node.id);
                      setReferenceSelect(true);
                      setFocusEdit(false);
                      setFocusRecenterVisible(true);
                    }}
                  >＋</button>
                  {canvasLinks
                    .filter((link) => link.from === node.id || link.to === node.id)
                    .map((link) => canvasNodes.find((item) => item.id === (link.from === node.id ? link.to : link.from)))
                    .filter((item): item is CanvasNode => Boolean(item && item.url))
                    .map((item) => (
                      <span className="canvas-reference-thumb" key={item.id}>
                        <img src={item.url} alt={item.name} />
                        <b><img src={item.url} alt="" /></b>
                      </span>
                    ))}
                </div>
                <div className="canvas-prompt-inline-content">
                  <textarea
                    className="canvas-inline-text"
                    aria-label="描述生成内容"
                    rows={1}
                    value={canvasPromptTexts[node.id] || ""}
                    onChange={(e) => {
                      setCanvasPromptTexts((values) => ({ ...values, [node.id]: e.target.value }));
                      e.currentTarget.style.height = "auto";
                      e.currentTarget.style.height = String(e.currentTarget.scrollHeight) + "px";
                    }}
                    placeholder={
                      focusPicks.length ? "" : "描述任何你想要生成的内容"
                    }
                  />
                  {focusPicks.map((pick) => (
                    <React.Fragment key={pick.id}>
                      <button
                        type="button"
                        className={`canvas-inline-focus-tag ${activeFocusTagId === pick.id ? "active" : ""}`}
                        onClick={() => setActiveFocusTagId(pick.id)}
                      >
                        <b>✦</b>
                        {focusChoices[pick.choice].name}
                      </button>
                      <input
                        className="canvas-inline-text"
                        aria-label={`在${focusChoices[pick.choice].name}后输入文字`}
                        value={focusTrailingText[pick.id] || ""}
                        onChange={(e) =>
                          setFocusTrailingText((values) => ({
                            ...values,
                            [pick.id]: e.target.value,
                          }))
                        }
                        style={{
                          width: focusTrailingText[pick.id]
                            ? Math.min(
                                420,
                                focusTrailingText[pick.id].length * 14 + 14,
                              )
                            : 10,
                        }}
                      />
                    </React.Fragment>
                  ))}
                </div>
                <div className="canvas-node-prompt-footer">
                  <div>
                    <button
                      className={promptPopover === "model" ? "active" : ""}
                      onClick={() =>
                        setPromptPopover((v) =>
                          v === "model" ? null : "model",
                        )
                      }
                    >
                      <img src="/assets/figma-home-model.svg" />
                      模型选择
                    </button>
                    <button
                      className={promptPopover === "size" ? "active" : ""}
                      onClick={() =>
                        setPromptPopover((v) => (v === "size" ? null : "size"))
                      }
                    >
                      <img src="/assets/figma-home-size.svg" />
                      尺寸选择
                    </button>
                  </div>
                  <button className="canvas-node-prompt-send" aria-label="发送" onClick={() => generateFromCanvasNode(node)}>
                    <img src="/assets/canvas-send.svg" />
                  </button>
                </div>
                {promptPopover === "model" && (
                  <div className="canvas-shared-model-popover">
                    <ModelPopover
                      onClose={() => setPromptPopover(null)}
                      selectedValue={promptModel}
                      onSelect={setPromptModel}
                    />
                  </div>
                )}
                {promptPopover === "size" && (
                  <CanvasSizePopover
                    quality={promptQuality}
                    ratio={promptRatio}
                    onQuality={setPromptQuality}
                    onRatio={setPromptRatio}
                  />
                )}
              </section>
            );
          })()}
        <nav className="canvas-vertical-nav" aria-label="画布工具">
          <button
            data-popover-trigger
            className={addOpen ? "active" : ""}
            aria-label="添加"
            onClick={() => {
              setAddPosition({ x: 118, y: 210 });
              setAddOpen((v) => !v);
              setMode(null);
              setQuickOpen(false);
            }}
          >
            <img src="/assets/canvas-nav-add.svg" />
          </button>
          <button
            data-popover-trigger
            className={mode === "focus" ? "active" : ""}
            aria-label="搜索"
            onClick={() => switchMode("focus")}
          >
            <img src="/assets/canvas-nav-search.svg" />
          </button>
          <button
            data-popover-trigger
            className={mode === "comments" ? "active" : ""}
            aria-label="评论"
            onClick={() => switchMode("comments")}
          >
            <img src="/assets/canvas-nav-chat.svg" />
          </button>
          <button data-popover-trigger className={mode === "assets" ? "active" : ""} aria-label="素材库" onClick={() => switchMode("assets")}>
            <img src="/assets/canvas-nav-assets-linear.svg" />
          </button>
          <button
            data-popover-trigger
            className={mode === "folder" ? "active" : ""}
            aria-label="文件夹"
            onClick={() => switchMode("folder")}
          >
            <img src="/assets/canvas-nav-folder.svg" />
          </button>
          <button
            data-popover-trigger
            className={mode === "history" ? "active" : ""}
            aria-label="历史"
            onClick={() => switchMode("history")}
          >
            <img src="/assets/canvas-nav-history.svg" />
          </button>
          <i />
          <button
            data-popover-trigger
            className={mode === "account" ? "active" : ""}
            onClick={() => switchMode("account")}
            aria-label="账户"
          >
            <img src="/assets/canvas-nav-avatar.svg" />
          </button>
        </nav>
        {addOpen && (
          <section
            className="canvas-add-popover positioned"
            style={{
              left: addPosition.x,
              top: addPosition.y,
              transform: "none",
            }}
            onDoubleClick={(e) => e.stopPropagation()}
          >
            <h3>添加内容</h3>
            <p>选择素材来源，添加到当前画布</p>
            <small>添加节点</small>
            <button onClick={() => ref.current?.click()}>
              <img src="/assets/figma-home-assets.svg" />
              <span>
                <b>图片</b>
                <em>添加图片节点，继续生成或编辑</em>
              </span>
            </button>
            <small>添加资源</small>
            <button onClick={() => switchMode("folder")}>
              <img src="/assets/canvas-nav-folder.svg" />
              <span>
                <b>新建文件夹</b>
                <em>现有节点进行打组</em>
              </span>
            </button>
            <button onClick={() => ref.current?.click()}>
              <img src="/assets/canvas-dock-upload.svg" />
              <span>
                <b>上传</b>
                <em>导入本地图片、参考图或素材</em>
              </span>
            </button>
            <button onClick={() => switchMode("history")}>
              <img src="/assets/canvas-nav-history.svg" />
              <span>
                <b>从生成历史选择</b>
                <em>复用已生成图片，快速加入画布</em>
              </span>
            </button>
          </section>
        )}
        {mode === "folder" && !folderDone && canvasImage && (
          <div
            className="folder-select-layer"
            onMouseDown={(e) => {
              const b = e.currentTarget.getBoundingClientRect();
              const p = { x: e.clientX - b.left, y: e.clientY - b.top };
              setDragStart(p);
              setSelection({ x: p.x, y: p.y, width: 0, height: 0 });
            }}
            onMouseMove={(e) => {
              if (!dragStart) return;
              const b = e.currentTarget.getBoundingClientRect();
              const x = e.clientX - b.left,
                y = e.clientY - b.top;
              setSelection({
                x: Math.min(x, dragStart.x),
                y: Math.min(y, dragStart.y),
                width: Math.abs(x - dragStart.x),
                height: Math.abs(y - dragStart.y),
              });
            }}
            onMouseUp={() => setDragStart(null)}
          >
            {selection && (
              <div className="folder-selection" style={selection} />
            )}{" "}
            {selection && selection.width > 20 && selection.height > 20 && (
              <button
                className="add-to-folder"
                onMouseDown={(e) => e.stopPropagation()}
                onClick={() => setFolderDone(true)}
              >
                ＋ 添加到文件夹
              </button>
            )}
          </div>
        )}
        {selection &&
          mode !== "folder" &&
          selection.width > 0 &&
          selection.height > 0 && (
            <>
              <div
                className="global-folder-selection"
                style={{
                  left: selection.x * (canvasZoom / 75),
                  top: selection.y * (canvasZoom / 75),
                  width: selection.width * (canvasZoom / 75),
                  height: selection.height * (canvasZoom / 75),
                }}
              />
              {!dragStart && selectedNodeIds.length > 0 && (
                <div
                  className="selection-action-stack"
                  style={{
                    left: (selection.x + selection.width) * (canvasZoom / 75) + 16,
                    top:
                      (selection.y + selection.height) * (canvasZoom / 75) - 27,
                  }}
                >
                  {selectedNodeIds.length > 1 && (
                    <button
                      className="group-selection-button"
                      onClick={() => {
                        const groupId = Date.now();
                        setCanvasGroups((groups) => [
                          ...groups
                            .map((group) => ({ ...group, nodeIds: group.nodeIds.filter((id) => !selectedNodeIds.includes(id)) }))
                            .filter((group) => group.nodeIds.length >= 2),
                          { id: groupId, nodeIds: [...selectedNodeIds], name: "未命名组" },
                        ]);
                        setGroupNameDraft("未命名组");
                        setGroupNameEditing(null);
                        setContextGroupId(null);
                        setActiveGroupId(groupId);
                        setSelection(null);
                      }}
                    >
                      打组
                    </button>
                  )}
                  <button
                    className="create-folder-button"
                    onClick={() => {
                      setMode("folder");
                      setFolderDone(true);
                      setSelection(null);
                    }}
                  >
                    ＋ 添加到文件夹
                  </button>
                </div>
              )}
            </>
          )}
        {mode === "folder" && folderDone && (
          <div
            className={`folder-result folder-browser ${folderExpanded ? "expanded" : ""}`}
            onClick={() => setFolderColorOpen(null)}
          >
            <div className="folder-expanded-images">
              {samples.slice(0, 3).map((src, i) => (
                <button
                  key={src}
                  style={{ "--folder-index": i } as React.CSSProperties}
                  aria-label={`打开项目名称${folderIndex + 1}中的图片 ${i + 1}`}
                  onClick={() => {
                    const title = folderNames[folderIndex];
                    setProjectTitle(title);
                    setCanvasImage(src);
                    setCanvasNodes([
                      {
                        id: Date.now(),
                        url: src,
                        x: 0,
                        y: 0,
                        name: title,
                      },
                    ]);
                    setActiveNodeId(null);
                    setFolderExpanded(false);
                    setMode(null);
                  }}
                >
                  <img src={src} />
                </button>
              ))}
            </div>
            <div className="folder-carousel">
              {folderNames.map((folder, index) => {
                const offset = index - folderIndex;
                const position =
                  offset < -2
                    ? "folder-out-left"
                    : offset > 2
                      ? "folder-out-right"
                      : `folder-offset-${offset + 2}`;
                return (
                  <button
                    key={index}
                    className={`folder-carousel-item ${position} ${offset === 0 ? "center" : ""}`}
                    aria-label={`文件夹 ${index + 1}`}
                    onContextMenu={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      setFolderDeleteIndex(index);
                      setFolderColorOpen(null);
                    }}
                    onClick={() => {
                      if (offset === 0) setFolderExpanded((v) => !v);
                      else {
                        setFolderIndex(index);
                        setFolderExpanded(false);
                      }
                    }}
                  >
                    <span
                      className="folder-color-wash"
                      style={{ background: folderColors[index] }}
                    />
                    <img
                      className="folder-art"
                      src="/assets/folder-group-54.png"
                    />
                    <div className="folder-meta">
                      <strong>{folder}</strong>
                      <small>2026.08.18</small>
                    </div>
                    {offset === 0 && (
                      <span
                        role="button"
                        tabIndex={0}
                        className="folder-color-trigger"
                        aria-label="更换文件夹颜色"
                        style={{ background: folderColors[index] }}
                        onClick={(event) => {
                          event.stopPropagation();
                          setFolderColorOpen((value) =>
                            value === index ? null : index,
                          );
                        }}
                      />
                    )}
                  </button>
                );
              })}
            </div>
            {folderIndex > 0 && (
              <button
                className="folder-switch folder-prev"
                aria-label="上一个文件夹"
                onClick={() => {
                  setFolderIndex((i) => Math.max(0, i - 1));
                  setFolderExpanded(false);
                  setFolderColorOpen(null);
                }}
              >
                ‹
              </button>
            )}
            {folderIndex < folderNames.length - 1 && (
              <button
                className="folder-switch folder-next"
                aria-label="下一个文件夹"
                onClick={() => {
                  setFolderIndex((i) => Math.min(folderNames.length - 1, i + 1));
                  setFolderExpanded(false);
                  setFolderColorOpen(null);
                }}
              >
                ›
              </button>
            )}
            {folderColorOpen !== null && (
              <div
                className="folder-color-popover"
                role="dialog"
                aria-label="选择文件夹颜色"
                onClick={(event) => event.stopPropagation()}
              >
                {[
                  "hsl(348 100% 96%)",
                  "hsl(28 100% 96%)",
                  "hsl(52 100% 96%)",
                  "hsl(142 100% 96%)",
                  "hsl(190 100% 96%)",
                  "#EDECFF",
                ].map((color) => (
                  <button
                    key={color}
                    aria-label={`选择颜色 ${color}`}
                    className={
                      folderColors[folderColorOpen] === color ? "selected" : ""
                    }
                    style={{ background: color }}
                    onClick={() => {
                      setFolderColors((colors) =>
                        colors.map((value, index) =>
                          index === folderColorOpen ? color : value,
                        ),
                      );
                      setFolderColorOpen(null);
                    }}
                  >
                    {folderColors[folderColorOpen] === color && <span>✓</span>}
                  </button>
                ))}
              </div>
            )}
            <div className="folder-create">
              <input
                aria-label="文件夹名称"
                placeholder="取个名字"
                value={folderName}
                onChange={(event) => setFolderName(event.target.value)}
              />
              {folderName.trim() && (
                <button
                  onClick={() => {
                    const name = folderName.trim();
                    if (!name) return;
                    setFolderNames((names) => [...names, name]);
                    setFolderColors((colors) => [...colors, "#EDECFF"]);
                    setFolders([...folders, name]);
                    setFolderIndex(folderNames.length);
                    setFolderName("");
                    setFolderExpanded(false);
                  }}
                >
                  创建
                </button>
              )}
            </div>
          </div>
        )}
        {mode === "folder" && folderDeleteIndex !== null && (
          <div className="folder-delete-backdrop" role="presentation">
            <section
              className="folder-delete-dialog"
              role="dialog"
              aria-modal="true"
              aria-labelledby="folder-delete-title"
              onClick={(event) => event.stopPropagation()}
            >
              <header>
                <h2 id="folder-delete-title">确认删除</h2>
                <button aria-label="关闭" onClick={() => setFolderDeleteIndex(null)}>×</button>
              </header>
              <p>文件夹“{folderNames[folderDeleteIndex]}”删除后将无法找回</p>
              <footer>
                <button className="cancel" onClick={() => setFolderDeleteIndex(null)}>取消</button>
                <button
                  className="confirm"
                  onClick={() => {
                    const removing = folderDeleteIndex;
                    const nextNames = folderNames.filter((_, index) => index !== removing);
                    const nextColors = folderColors.filter((_, index) => index !== removing);
                    setFolderNames(nextNames);
                    setFolderColors(nextColors);
                    setFolderIndex(Math.max(0, Math.min(removing, nextNames.length - 1)));
                    setFolderExpanded(false);
                    setFolderDeleteIndex(null);
                  }}
                >
                  删除
                </button>
              </footer>
            </section>
          </div>
        )}
        {mode === "assets" && (
          <>
            <AssetLibrary
              selected={selectedTeacher}
              onSelect={(i) => {
                setSelectedTeacher(i);
                setApplied(false);
              }}
              onClose={() => {
                setMode(null);
                setSelectedTeacher(0);
              }}
            />
            {activeLibraryAsset && (
              <div
                className="apply-popover"
                style={{ top: selectedTeacher === 5 ? 259 : selectedTeacher === 6 ? 447 : 291 + (selectedTeacher - 1) * 32 }}
              >
                <h3>{activeLibraryAsset.group}</h3>
                <p>{activeLibraryAsset.description}</p>
                <div className="selected-teacher">
                  <img src={activeLibraryAsset.url} />
                  <span>{activeLibraryAsset.name}</span>
                  <small>已选中</small>
                </div>
                <button
                  className="apply-canvas"
                  onClick={() => {
                    const source = activeLibraryAsset.url;
                    const name = activeLibraryAsset.name;
                    const nextId = Math.max(0, ...canvasNodes.map((node) => node.id)) + 1;
                    const center = getViewportCenterOffset();
                    setCanvasNodes((nodes) => [...nodes, { id: nextId, url: source, x: center.x, y: center.y, name }]);
                    setCanvasImage(source);
                    setActiveNodeId(nextId);
                    setApplied(true);
                  }}
                >
                  {applied ? "已应用到画布" : "应用到画布"}{" "}
                  <img src="/assets/apply.svg" />
                </button>
              </div>
            )}
          </>
        )}
        {mode === "history" && <HistoryDrawer onClose={() => setMode(null)} />}{" "}
        {mode !== "folder" && (
          <div className="canvas-comment-world-layer">
            {canvasComments.map((comment) => (
          <div
            className={`canvas-comment-marker-wrap ${selectedCommentIds.includes(comment.id) ? "selected" : ""}`}
            style={{
              left: comment.x,
              top: comment.y,
              "--comment-inverse-scale": 75 / canvasZoom,
            } as React.CSSProperties}
            key={comment.id}
          >
            <button className="canvas-comment-marker" aria-label="查看评论">
              Y
            </button>
            <aside className="canvas-comment-card">
              <header>
                <span>Y</span>
                <strong>yhdd_1009</strong>
                <small>刚刚</small>
                <button
                  aria-label="完成评论"
                  onClick={(e) => {
                    e.stopPropagation();
                    setCanvasComments((items) =>
                      items.filter((item) => item.id !== comment.id),
                    );
                  }}
                >
                  ✓
                </button>
              </header>
              <p>{comment.text}</p>
              <div className="canvas-comment-reply">
                <input placeholder="回复讨论…" maxLength={200} />
                <span>0/200</span>
                <button aria-label="发送回复">↑</button>
              </div>
            </aside>
          </div>
            ))}
          </div>
        )}{" "}
        {mode === "comments" && commentPosition && (
          <CanvasCommentPanel
            position={commentPosition}
            onSubmit={(text) => {
              setCanvasComments((items) => [
                ...items,
                {
                  id: Date.now(),
                  x: commentPosition.x,
                  y: commentPosition.y,
                  viewportX: commentPosition.viewportX,
                  viewportY: commentPosition.viewportY,
                  text,
                },
              ]);
              setCommentPosition(null);
            }}
          />
        )}
        {mode === "focus" && (
          <CanvasSearchModal
            onClose={() => setMode(null)}
            onChoose={() => {
              setCanvasImage("/assets/template-2.png");
              setMode(null);
            }}
          />
        )}
        {mode !== "comments" && (
          <div className="figma-zoom" aria-hidden={canvasNodes.length === 0}>
            <button
              aria-label="缩小画布"
              onClick={(event) => zoomCanvasAtPoint(canvasZoom - 10, event.clientX, event.clientY)}
            >
              <img src="/assets/zoom-minus.svg" />
            </button>
            <b>{Math.round(canvasZoom)}%</b>
            <button
              aria-label="放大画布"
              onClick={(event) => zoomCanvasAtPoint(canvasZoom + 10, event.clientX, event.clientY)}
            >
              <img src="/assets/zoom-plus.svg" />
            </button>
            <button
              onClick={() => {
                zoomAppliedRef.current = 75;
                zoomTargetRef.current = 75;
                setCanvasZoom(75);
                if (canvasRef.current) {
                  const canvas = canvasRef.current;
                  canvasRef.current.scrollTo({
                    left: CANVAS_WORLD_CENTER - canvas.clientWidth / 2,
                    top: CANVAS_WORLD_CENTER - canvas.clientHeight / 2,
                    behavior: "smooth",
                  });
                }
              }}
            >
              适应画面
            </button>
          </div>
        )}
        {mode !== "comments" &&
          redrawNode &&
          ["局部重绘", "擦除", "扩图"].includes(canvasTool) && (
            <section
              className="canvas-node-prompt canvas-tool-node-prompt"
              style={{
                left: (CANVAS_WORLD_CENTER + redrawNode.x) * (canvasZoom / 75),
                top: (CANVAS_WORLD_CENTER + redrawNode.y + getNodeGeometry(redrawNode).cardHeight / 2) * (canvasZoom / 75) + 14,
              }}
            >
              <div className="canvas-tool-prompt-heading">
                <img src={canvasTool === "局部重绘" ? "/assets/canvas-dock-redraw.svg" : canvasTool === "擦除" ? "/assets/canvas-dock-erase.svg" : "/assets/canvas-dock-text.svg"} />
                <strong>{canvasTool}</strong>
              </div>
              <input
                className="canvas-tool-prompt-input"
                aria-label={`${canvasTool}生成描述`}
                value={canvasToolPromptText}
                onChange={(event) => setCanvasToolPromptText(event.target.value)}
                placeholder={canvasTool === "擦除" ? "描述擦除后的画面内容" : canvasTool === "局部重绘" ? "描述需要重新生成的内容" : "描述希望扩展的画面内容"}
              />
              <div className="canvas-tool-prompt-footer">
                <span>{canvasTool === "擦除" ? "绘制蒙版后生成" : canvasTool === "局部重绘" ? "绘制需要重绘的区域" : `应用${canvasTool}`}</span>
                <button aria-label={`执行${canvasTool}`} onClick={() => {
                  generateFromCanvasNode(redrawNode);
                  if (canvasTool === "扩图") {
                    setCanvasTool("移动");
                    setExpandFrame(null);
                  }
                }}>
                  <img src="/assets/canvas-send.svg" />
                </button>
              </div>
            </section>
          )}
        {["局部重绘", "擦除"].includes(canvasTool) && redrawNode && mode !== "comments" && (
          <div
            className="canvas-redraw-toolbar"
            style={{
              left: (CANVAS_WORLD_CENTER + redrawNode.x) * (canvasZoom / 75),
              top: (CANVAS_WORLD_CENTER + redrawNode.y - getNodeGeometry(redrawNode).cardHeight / 2) * (canvasZoom / 75) - 62,
            }}
          >
            <button className="redraw-close" aria-label={`关闭${canvasTool}`} onClick={() => setCanvasTool("移动")}>×</button>
            <i />
            <button className={redrawMode === "画笔" ? "active" : ""} aria-label="画笔重绘" onClick={() => setRedrawMode("画笔")}><img src="/assets/figma-brush.svg" /></button>
            <button className={redrawMode === "框选" ? "active" : ""} aria-label="框选重绘" onClick={() => setRedrawMode("框选")}><img src="/assets/figma-resize.svg" /></button>
            <button className={redrawMode === "橡皮" ? "active" : ""} aria-label="橡皮擦" onClick={() => setRedrawMode("橡皮")}><img src="/assets/figma-eraser-mode.svg" /></button>
            <i />
            <img className="redraw-brush-small" src="/assets/figma-brush-small.svg" />
            <input aria-label="笔触大小" type="range" min="8" max="100" value={redrawBrushSize} onChange={(event) => setRedrawBrushSize(Number(event.target.value))} />
            <img className="redraw-brush-large" src="/assets/figma-brush-small.svg" />
            <i />
            <div className="redraw-history-group">
              <button aria-label="撤销" disabled={!redrawUndoStack.length} onClick={() => setRedrawUndoStack((history)=>{if(!history.length)return history;const previous=history[history.length-1];setRedrawStrokes((current)=>{setRedrawRedoStack((redo)=>[...redo,current]);return previous;});return history.slice(0,-1);})}><img src="/assets/figma-undo.svg" /></button>
              <button aria-label="重做" disabled={!redrawRedoStack.length} onClick={() => setRedrawRedoStack((redo)=>{if(!redo.length)return redo;const next=redo[redo.length-1];setRedrawStrokes((current)=>{setRedrawUndoStack((history)=>[...history,current]);return next;});return redo.slice(0,-1);})}><img src="/assets/figma-redo.svg" /></button>
            </div>
          </div>
        )}
        {canvasTool === "裁剪" && cropNode && mode !== "comments" && (
          <CanvasCropWorkspace
            src={cropNode.url}
            closing={cropClosing}
            onGenerate={(keyword) => {
              generateFromCanvasNode(cropNode, keyword);
              setCanvasTool("移动");
              setCropClosing(false);
            }}
            onClose={() => {
              setCropClosing(true);
              if (cropExitTimer.current)
                window.clearTimeout(cropExitTimer.current);
              cropExitTimer.current = window.setTimeout(() => {
                setCanvasTool("移动");
                setCropClosing(false);
              }, 240);
            }}
          />
        )}
        {canvasImage && mode !== "comments" && (
          <nav className="canvas-bottom-dock" aria-label="图片编辑工具">
            {[
              ["移动", "canvas-dock-move.svg"],
              ["局部重绘", "canvas-dock-redraw.svg"],
              ["擦除", "canvas-dock-erase.svg"],
              ["高清画质", "canvas-dock-hd.svg"],
              ["扩图", "canvas-dock-text.svg"],
              ["裁剪", "canvas-dock-color.svg"],
              ["下载", "canvas-dock-download.svg"],
              ["预览", "canvas-dock-preview.svg"],
            ].map(([label, icon], i) => (
              <React.Fragment key={label}>
                {i === 6 && <i />}
                <button
                  className={canvasTool === label ? "active" : ""}
                  aria-label={label}
                  onClick={() => handleDockAction(label)}
                >
                  <img src={`/assets/${icon}`} />
                </button>
              </React.Fragment>
            ))}
          </nav>
        )}
      </div>
      <input
        ref={ref}
        hidden
        multiple
        type="file"
        accept="image/*"
        onChange={(e) => {
          const files = Array.from(e.target.files || []);
          if (!files.length) return;
          const stamp = Date.now();
          const center = getViewportCenterOffset();
          if (uploadTargetNodeId !== null) {
            const first = files[0],
              url = URL.createObjectURL(first);
            setCanvasNodes((nodes) =>
              nodes.map((node) =>
                node.id === uploadTargetNodeId
                  ? {
                      ...node,
                      url,
                      name:
                        first.name.replace(/\.[^.]+$/, "") ||
                        "AI 视觉创作 · 未命名项目",
                      placeholder: false,
                    }
                  : node,
              ),
            );
            setCanvasImage(url);
            if (files.length > 1) {
              const added = files
                .slice(1)
                .map((file, i) => ({
                  id: stamp + i,
                  url: URL.createObjectURL(file),
                  x: center.x + (i + 1) * 390,
                  y: center.y,
                  name:
                    file.name.replace(/\.[^.]+$/, "") ||
                    "AI 视觉创作 · 未命名项目",
                }));
              setCanvasNodes((nodes) => [...nodes, ...added]);
            }
            setUploadTargetNodeId(null);
          } else {
            const added = files.map((file, i) => ({
              id: stamp + i,
              url: URL.createObjectURL(file),
              x: center.x + i * 390,
              y: center.y,
              name:
                file.name.replace(/\.[^.]+$/, "") || "AI 视觉创作 · 未命名项目",
            }));
            setCanvasNodes((v) => [...v, ...added]);
            setCanvasImage(added[0].url);
          }
          e.currentTarget.value = "";
          setAddOpen(false);
          setQuickOpen(false);
        }}
      />
    </section>
  );
}

function CanvasModelPopover({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const models = [
    ["图片 5.0 Pro", "商业设计与高密度图文表现", "figma-model-pro.svg"],
    ["图片 5.0 Lite", "响应更精准，生成效果更智能", "figma-model-lite.svg"],
    ["图片 4.5", "风格稳定，图文响应均衡", "figma-model-45.svg"],
  ];
  return (
    <section className="canvas-model-popover">
      <h3>模型选择</h3>
      {models.map(([name, desc, icon]) => (
        <button
          key={name}
          className={value === name ? "active" : ""}
          onClick={() => onChange(name)}
        >
          <img src={`/assets/${icon}`} />
          <span>
            <strong>{name}</strong>
            <small>{desc}</small>
          </span>
          {value === name && (
            <img className="model-check" src="/assets/figma-model-check.svg" />
          )}
        </button>
      ))}
    </section>
  );
}

function CanvasSizePopover({
  quality,
  ratio,
  onQuality,
  onRatio,
}: {
  quality: string;
  ratio: string;
  onQuality: (value: string) => void;
  onRatio: (value: string) => void;
}) {
  const [width, setWidth] = useState("1456"),
    [height, setHeight] = useState("816");
  const [linked, setLinked] = useState(true);
  const ratios = [
    "1:1",
    "3:2",
    "2:3",
    "4:3",
    "3:4",
    "9:16",
    "1:1(2k)",
    "16:9(2k)",
    "9:16(2k)",
    "16:9(4k)",
    "9:16(4k)",
    "智能",
  ];
  return (
    <section className="canvas-size-popover">
      <h3>尺寸选择</h3>
      <label>生成质量</label>
      <div className="canvas-quality-row">
        {["高", "中", "低"].map((item) => (
          <button
            key={item}
            className={quality === item ? "active" : ""}
            onClick={() => onQuality(item)}
          >
            {item}
          </button>
        ))}
      </div>
      <label>尺寸</label>
      <div className="canvas-size-fields">
        <span>
          W
          <input
            value={width}
            onChange={(e) => { const next=e.target.value.replace(/\D/g, ""); setWidth(next); const match=ratio.match(/^(\d+):(\d+)/); if(linked&&next&&match) setHeight(String(Math.round(Number(next)*Number(match[2])/Number(match[1])))); }}
          />
        </span>
        <button className={`size-link-toggle ${linked ? "active" : ""}`} aria-label={linked ? "取消宽高关联" : "关联宽高"} aria-pressed={linked} onClick={()=>setLinked((value)=>!value)}><img src="/assets/figma-size-link.svg" /></button>
        <span>
          H
          <input
            value={height}
            onChange={(e) => { const next=e.target.value.replace(/\D/g, ""); setHeight(next); const match=ratio.match(/^(\d+):(\d+)/); if(linked&&next&&match) setWidth(String(Math.round(Number(next)*Number(match[1])/Number(match[2])))); }}
          />
        </span>
      </div>
      <label>选择比例</label>
      <div className="canvas-ratio-grid">
        {ratios.map((item) => (
          <button
            key={item}
            className={ratio === item ? "active" : ""}
            onClick={() => { onRatio(item); const match=item.match(/^(\d+):(\d+)/); if(linked&&match) setHeight(String(Math.round(Number(width||1456)*Number(match[2])/Number(match[1])))); }}
          >
            <i className={`ratio-shape ratio-${item.replace(/[^0-9]/g, "")}`} />
            <small>{item}</small>
          </button>
        ))}
      </div>
    </section>
  );
}

function CanvasCropWorkspace({
  src,
  closing,
  onClose,
  onGenerate,
}: {
  src: string;
  closing: boolean;
  onClose: () => void;
  onGenerate: (keyword: string) => void;
}) {
  type CropRect = { x: number; y: number; width: number; height: number };
  const [rect, setRect] = useState<CropRect>({
    x: 45,
    y: 0,
    width: 520,
    height: 500,
  });
  const [ratio, setRatio] = useState("原图比例");
  const [ratioOpen, setRatioOpen] = useState(false);
  const [prompt, setPrompt] = useState("");
  const drag = useRef<{
    kind: string;
    startX: number;
    startY: number;
    rect: CropRect;
  } | null>(null);
  const applyRatio = (label: string) => {
    setRatio(label);
    if (label === "原图比例" || label === "自定义…") return;
    const [rw, rh] = label.split(":").map(Number);
    const maxW = 520,
      maxH = 500;
    let width = maxW,
      height = (width * rh) / rw;
    if (height > maxH) {
      height = maxH;
      width = (height * rw) / rh;
    }
    setRect({
      x: 45 + (520 - width) / 2,
      y: (500 - height) / 2,
      width,
      height,
    });
  };
  const move = (e: React.PointerEvent<HTMLDivElement>) => {
    const current = drag.current;
    if (!current) return;
    const dx = e.clientX - current.startX,
      dy = e.clientY - current.startY;
    let { x, y, width, height } = current.rect;
    if (current.kind === "move") {
      x = Math.max(45, Math.min(565 - width, x + dx));
      y = Math.max(0, Math.min(500 - height, y + dy));
    } else {
      if (current.kind.includes("e"))
        width = Math.max(120, Math.min(565 - x, width + dx));
      if (current.kind.includes("s"))
        height = Math.max(120, Math.min(500 - y, height + dy));
      if (current.kind.includes("w")) {
        const nx = Math.max(45, Math.min(x + width - 120, x + dx));
        width += x - nx;
        x = nx;
      }
      if (current.kind.includes("n")) {
        const ny = Math.max(0, Math.min(y + height - 120, y + dy));
        height += y - ny;
        y = ny;
      }
    }
    setRect({ x, y, width, height });
  };
  return (
    <div className={`canvas-crop-workspace ${closing ? "is-closing" : ""}`}>
      <div
        className="canvas-crop-stage"
        onMouseDown={(e) => e.stopPropagation()}
        onPointerMove={move}
        onPointerUp={(e) => {
          drag.current = null;
          if (e.currentTarget.hasPointerCapture(e.pointerId))
            e.currentTarget.releasePointerCapture(e.pointerId);
        }}
      >
        <div className="canvas-crop-source">
          <img src={src} draggable={false} />
        </div>
        <div
          className="canvas-crop-mask"
          style={{ left: 45, top: 0, width: 520, height: rect.y }}
        />
        <div
          className="canvas-crop-mask"
          style={{
            left: 45,
            top: rect.y + rect.height,
            width: 520,
            height: 500 - rect.y - rect.height,
          }}
        />
        <div
          className="canvas-crop-mask"
          style={{
            left: 45,
            top: rect.y,
            width: rect.x - 45,
            height: rect.height,
          }}
        />
        <div
          className="canvas-crop-mask"
          style={{
            left: rect.x + rect.width,
            top: rect.y,
            width: 565 - rect.x - rect.width,
            height: rect.height,
          }}
        />
        <div
          className="canvas-crop-frame"
          style={{
            left: rect.x,
            top: rect.y,
            width: rect.width,
            height: rect.height,
          }}
          onPointerDown={(e) => {
            e.stopPropagation();
            e.currentTarget.parentElement?.setPointerCapture(e.pointerId);
            drag.current = {
              kind: (e.target as HTMLElement).dataset.resize || "move",
              startX: e.clientX,
              startY: e.clientY,
              rect,
            };
          }}
        >
          {["nw", "n", "ne", "e", "se", "s", "sw", "w"].map((handle) => (
            <i
              key={handle}
              className={`crop-handle ${handle}`}
              data-resize={handle}
            />
          ))}
        </div>
        {ratioOpen && (
          <aside className="canvas-crop-ratios">
            {[
              "原图比例",
              "1 : 1",
              "4 : 3",
              "3 : 4",
              "16 : 9",
              "9 : 16",
              "21 : 9",
              "自定义…",
            ].map((item) => (
              <button
                key={item}
                className={ratio === item ? "active" : ""}
                onClick={() => {
                  applyRatio(item);
                  setRatioOpen(false);
                }}
              >
                {item}
              </button>
            ))}
          </aside>
        )}
        <footer className="canvas-crop-actions">
          <button className="crop-close" onClick={onClose}>
            ×
          </button>
          <i />
          <button
            className={`crop-ratio-button ${ratioOpen ? "active" : ""}`}
            onClick={() => setRatioOpen((v) => !v)}
          >
            <img src="/assets/crop-ratio.svg" />宽高比
          </button>
          <i />
          <input value={prompt} onChange={(event) => setPrompt(event.target.value)} placeholder="描述裁剪后希望生成的画面" />
          <button className="crop-quality">4K</button>
          <button className="crop-submit" aria-label="确认裁剪并生成" onClick={() => onGenerate(prompt)}>
            <img src="/assets/canvas-send.svg" />
          </button>
        </footer>
      </div>
    </div>
  );
}

function CanvasCommentPanel({
  position,
  onSubmit,
}: {
  position: { x: number; y: number; viewportX: number; viewportY: number };
  onSubmit: (text: string) => void;
}) {
  const [comment, setComment] = useState("");
  return (
    <section
      className="canvas-comment-panel canvas-comment-at-point"
      style={
        {
          "--comment-x": `${position.x}px`,
          "--comment-y": `${position.y}px`,
          "--comment-viewport-x": `${position.viewportX}px`,
          "--comment-viewport-y": `${position.viewportY}px`,
        } as React.CSSProperties
      }
    >
      <textarea
        autoFocus
        maxLength={200}
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        onKeyDown={(e) => {
          if ((e.ctrlKey || e.metaKey) && e.key === "Enter" && comment.trim())
            onSubmit(comment.trim());
        }}
        placeholder="输入你的评论…"
      />
      <footer>
        <span>{comment.length}/200</span>
        <button
          disabled={!comment.trim()}
          aria-label="发送评论"
          onClick={() => comment.trim() && onSubmit(comment.trim())}
        >
          <img src="/assets/canvas-comment-send.svg" />
        </button>
      </footer>
    </section>
  );
}

function CanvasSearchModal({
  onClose,
  onChoose,
}: {
  onClose: () => void;
  onChoose: () => void;
}) {
  const [query, setQuery] = useState("");
  const [view, setView] = useState<"list" | "grid">("list");
  const [selected, setSelected] = useState<number[]>([]);
  const [filterOpen, setFilterOpen] = useState(false);
  const [filter, setFilter] = useState("显示全部");
  const rows = [
    ["2026-08-05 19:06", "编辑于 23 分钟前"],
    ["2026-08-05 19:06", "编辑于 6 分钟前"],
    ["2026-08-03 16:57", "编辑于 17 小时前"],
    ["2026-06-24 10:32", "编辑于 1 个月前"],
    ["2026-06-23 18:37", "编辑于 1 个月前"],
  ];
  const imageOnlyEmpty = filter === "仅看图片";
  const visible = imageOnlyEmpty
    ? []
    : query.trim() && !"untitled".includes(query.trim().toLowerCase())
      ? []
      : rows;
  const isSearchMiss = visible.length === 0 && query.trim().length > 0;
  const toggle = (i: number) =>
    setSelected((v) => (v.includes(i) ? v.filter((n) => n !== i) : [...v, i]));
  return (
    <div className="canvas-search-backdrop">
      <section
        className="canvas-search-modal"
        onWheelCapture={(event) => {
          const scrollable = (event.target as HTMLElement).closest<HTMLElement>(
            ".search-list,.search-grid,.search-empty",
          );
          if (!scrollable) return;
          event.preventDefault();
          event.stopPropagation();
          scrollable.scrollTop += event.deltaY;
        }}
      >
        <header>
          <strong>选择图片</strong>
          <button onClick={onClose} aria-label="关闭">
            ×
          </button>
        </header>
        <div className="canvas-search-toolbar">
          <button className="all-filter">全部</button>
          <div className="search-controls">
            <label>
              <img src="/assets/canvas-nav-search.svg" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="搜索"
              />
            </label>
            <div className="search-filter-wrap">
              <button onClick={() => setFilterOpen((v) => !v)}>
                {filter}
                <img src="/assets/canvas-search-chevron.svg" />
              </button>
              {filterOpen && (
                <div>
                  {["显示全部", "仅看图片", "仅看项目"].map((v) => (
                    <button
                      className={filter === v ? "active" : ""}
                      onClick={() => {
                        setFilter(v);
                        setFilterOpen(false);
                      }}
                      key={v}
                    >
                      {v}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <button
              className={view === "grid" ? "active" : ""}
              onClick={() => setView("grid")}
              aria-label="卡片视图"
            >
              <span className="nine-grid-icon" aria-hidden="true">
                {Array.from({ length: 9 }, (_, index) => <i key={index} />)}
              </span>
            </button>
            <button
              className={view === "list" ? "active" : ""}
              onClick={() => setView("list")}
              aria-label="列表视图"
            >
              <img src="/assets/canvas-search-view.svg" />
            </button>
          </div>
        </div>
        <p className="search-selected-count">
          已选 <b>{selected.length}/10</b> 张
        </p>
        {visible.length === 0 ? (
          <div
            className={`search-empty dog-empty ${isSearchMiss ? "miss" : "blank"}`}
          >
            <img
              src={
                imageOnlyEmpty
                  ? "/assets/dog-search-empty.png"
                  : view === "grid"
                    ? "/assets/dog-search-empty.png"
                    : "/assets/dog-search-none.png"
              }
            />
            <strong>
              {isSearchMiss ? "没有找到相关内容" : "这里还没有图片"}
            </strong>
            <small>
              {isSearchMiss
                ? "换个关键词试试看吧"
                : "上传或生成图片后，会显示在这里"}
            </small>
          </div>
        ) : view === "list" ? (
          <div className="search-list">
            <div className="search-table-head">
              <span>预览</span>
              <span>名称</span>
              <span>类型</span>
              <span>内容</span>
              <span>创建时间</span>
              <span>最近更新</span>
            </div>
            {visible.map((row, i) => (
              <button
                className={selected.includes(i) ? "selected" : ""}
                onClick={() => toggle(i)}
                key={i}
              >
                <i />
                <strong>Untitled</strong>
                <span>项目</span>
                <span>图片</span>
                <span>{row[0]}</span>
                <small>{row[1]}</small>
              </button>
            ))}
          </div>
        ) : (
          <div className="search-grid">
            {visible.map((row, i) => (
              <button
                className={selected.includes(i) ? "selected" : ""}
                onClick={() => toggle(i)}
                key={i}
              >
                <div>
                  {selected.includes(i) && (
                    <span>
                      <img src="/assets/canvas-search-check.svg" />
                    </span>
                  )}
                </div>
                <strong>Untitled</strong>
                <small>{row[1]}</small>
              </button>
            ))}
          </div>
        )}
        <button
          className="search-confirm"
          disabled={!selected.length}
          onClick={onChoose}
        >
          确定
        </button>
      </section>
    </div>
  );
}

function AssetLibrary({
  selected,
  onSelect,
  onClose,
}: {
  selected: number;
  onSelect: (i: number) => void;
  onClose: () => void;
}) {
  const [scope, setScope] = useState<"个人" | "团队">("团队");
  const [query, setQuery] = useState("");
  const [teachers, setTeachers] = useState(["冯梦飞", "李颖", "憨爸", "临风"]);
  const teacherImages = ["/assets/feng-mengfei.png", "/assets/teacher-liying.png", "/assets/teacher-hanba.png", "/assets/teacher-linfeng.png"];
  const [folderNames, setFolderNames] = useState({ poster: "海报", teachers: "教师形象照", logo: "logo" });
  const [posterName, setPosterName] = useState("孩子开学抢跑必备神器");
  const [logoName, setLogoName] = useState("洋葱学园");
  const [collapsed, setCollapsed] = useState({ poster: false, teachers: false, logo: false });
  const [editing, setEditing] = useState<string | null>(null);
  const [renameDraft, setRenameDraft] = useState("");
  const beginInlineRename = (key: string, current: string) => { setEditing(key); setRenameDraft(current); };
  const commitInlineRename = () => {
    const value=renameDraft.trim(); const key=editing;
    if (value && key) {
      if (key.startsWith("teacher-")) { const index=Number(key.split("-")[1]); setTeachers((items)=>items.map((item,i)=>i===index?value:item)); }
      else if (key === "poster-file") setPosterName(value);
      else if (key === "logo-file") setLogoName(value);
      else if (["poster","teachers","logo"].includes(key)) setFolderNames((names)=>({...names,[key]:value}));
    }
    setEditing(null);
  };
  const visibleTeachers = teachers.map((name, index) => ({ name, index })).filter(({ name }) => name.toLowerCase().includes(query.trim().toLowerCase()));
  const beginAssetDrag = (event: React.DragEvent, name: string, url: string) => {
    event.dataTransfer.effectAllowed = "copy";
    event.dataTransfer.setData("application/x-canvas-asset", JSON.stringify({ name, url }));
  };
  return (
    <aside className="asset-library-panel" onDoubleClick={(event) => event.stopPropagation()}>
      <div className="asset-title">
        <button onClick={onClose}>
          <img src="/assets/asset-back.svg" />
        </button>
        <h2>素材库</h2>
      </div>
      <div className="asset-scope">
        {["个人", "团队"].map((item) => <button className={scope === item ? "active" : ""} onClick={() => setScope(item as "个人" | "团队")} key={item}>{item}</button>)}
      </div>
      <label className="asset-search">
        <img src="/assets/asset-search.svg" />
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索主体名称" />
      </label>
      <div className="subject-title">
        <strong>主体库</strong>
      </div>
      <div className="asset-divider" />
      <small className="folder-label">文件夹</small>
      <div className="asset-tree">
        <div className="tree-row">
          <img className="tree-chevron" src={collapsed.poster ? "/assets/asset-chevron-right.svg" : "/assets/asset-chevron.svg"} onClick={() => setCollapsed((value)=>({...value,poster:!value.poster}))} />
          <i className="folder-icon cyan" />
          {editing==="poster"?<input className="asset-inline-rename" autoFocus value={renameDraft} onChange={(e)=>setRenameDraft(e.target.value)} onBlur={commitInlineRename} onKeyDown={(e)=>{if(e.key==="Enter")commitInlineRename();if(e.key==="Escape")setEditing(null);}}/>:<b onDoubleClick={()=>beginInlineRename("poster",folderNames.poster)}>{folderNames.poster}</b>}
        </div>
        {!collapsed.poster &&
        <div role="button" tabIndex={0} draggable onDragStart={(event)=>beginAssetDrag(event,posterName,"/assets/school-kickoff-poster.png")} className={`asset-tree-entry asset-poster-file ${selected===5?"selected":""}`} onClick={()=>onSelect(5)} onDoubleClick={(event)=>{event.preventDefault();event.stopPropagation();beginInlineRename("poster-file",posterName);}}>
          <img src="/assets/school-kickoff-poster.png" />
          {editing==="poster-file"?<input className="asset-inline-rename" autoFocus value={renameDraft} onClick={(e)=>e.stopPropagation()} onChange={(e)=>setRenameDraft(e.target.value)} onBlur={commitInlineRename} onKeyDown={(e)=>{if(e.key==="Enter")commitInlineRename();if(e.key==="Escape")setEditing(null);}}/>:<span>{posterName}</span>}
        </div>}
        <div className={`tree-row ${collapsed.teachers ? "" : "expanded"}`}>
          <img className="tree-chevron" src={collapsed.teachers ? "/assets/asset-chevron-right.svg" : "/assets/asset-chevron.svg"} onClick={() => setCollapsed((value)=>({...value,teachers:!value.teachers}))} />
          <i className="folder-icon blue" />
          {editing==="teachers"?<input className="asset-inline-rename" autoFocus value={renameDraft} onChange={(e)=>setRenameDraft(e.target.value)} onBlur={commitInlineRename} onKeyDown={(e)=>{if(e.key==="Enter")commitInlineRename();if(e.key==="Escape")setEditing(null);}}/>:<b onDoubleClick={()=>beginInlineRename("teachers",folderNames.teachers)}>{folderNames.teachers}</b>}
        </div>
        {!collapsed.teachers && visibleTeachers.map(({name:v,index:i}) => (
          <div
            role="button"
            tabIndex={0}
            draggable
            onDragStart={(event)=>beginAssetDrag(event,v,teacherImages[i])}
            className={`asset-tree-entry ${selected === i + 1 ? "selected" : ""}`}
            onClick={() => onSelect(i + 1)}
            onDoubleClick={(event) => { event.preventDefault(); event.stopPropagation(); beginInlineRename(`teacher-${i}`, v); }}
            key={v}
          >
            <img src={teacherImages[i]} />
            {editing===`teacher-${i}`?<input className="asset-inline-rename" autoFocus value={renameDraft} onClick={(e)=>e.stopPropagation()} onChange={(e)=>setRenameDraft(e.target.value)} onBlur={commitInlineRename} onKeyDown={(e)=>{if(e.key==="Enter")commitInlineRename();if(e.key==="Escape")setEditing(null);}}/>:<span>{v}</span>}
          </div>
        ))}
        {!visibleTeachers.length && <p className="asset-search-empty">未找到“{query}”</p>}
        <div className="tree-row logo-row">
          <img className="tree-chevron" src={collapsed.logo ? "/assets/asset-chevron-right.svg" : "/assets/asset-chevron.svg"} onClick={() => setCollapsed((value)=>({...value,logo:!value.logo}))} />
          <i className="folder-icon green" />
          {editing==="logo"?<input className="asset-inline-rename" autoFocus value={renameDraft} onChange={(e)=>setRenameDraft(e.target.value)} onBlur={commitInlineRename} onKeyDown={(e)=>{if(e.key==="Enter")commitInlineRename();if(e.key==="Escape")setEditing(null);}}/>:<b onDoubleClick={()=>beginInlineRename("logo",folderNames.logo)}>{folderNames.logo}</b>}
        </div>
        {!collapsed.logo && <div role="button" tabIndex={0} draggable onDragStart={(event)=>beginAssetDrag(event,logoName,"/assets/brand-logo-kcle.png")} className={`asset-tree-entry asset-logo-file ${selected===6?"selected":""}`} onClick={()=>onSelect(6)} onDoubleClick={(event)=>{event.preventDefault();event.stopPropagation();beginInlineRename("logo-file",logoName);}}><img src="/assets/brand-logo-kcle.png" />{editing==="logo-file"?<input className="asset-inline-rename" autoFocus value={renameDraft} onClick={(e)=>e.stopPropagation()} onChange={(e)=>setRenameDraft(e.target.value)} onBlur={commitInlineRename} onKeyDown={(e)=>{if(e.key==="Enter")commitInlineRename();if(e.key==="Escape")setEditing(null);}}/>:<span>{logoName}</span>}</div>}
      </div>
    </aside>
  );
}

function CanvasDrawer({ mode }: { mode: "assets" | "history" | "comments" }) {
  return (
    <aside className="canvas-drawer">
      <h2>
        {mode === "assets"
          ? "素材库"
          : mode === "history"
            ? "历史版本"
            : "评论"}
      </h2>
      {mode === "comments" ? (
        <>
          <textarea placeholder="添加评论…" />
          <button className="primary">发表评论</button>
        </>
      ) : (
        <div className="drawer-grid">
          {samples.slice(0, 4).map((src, i) => (
            <button key={src}>
              <img src={src} />
              <span>
                {mode === "assets" ? "素材 " + (i + 1) : "版本 " + (i + 1)}
              </span>
            </button>
          ))}
        </div>
      )}
    </aside>
  );
}

function HistoryDrawer({ onClose }: { onClose: () => void }) {
  const [tab, setTab] = useState<"海报" | "直播间" | "PPT">("海报");
  return (
    <aside className="figma-history-panel">
      <div className="figma-history-title">
        <button onClick={onClose} aria-label="关闭历史">
          <img src="/assets/history-back.svg" />
        </button>
        <h2>历史</h2>
        <span />
        <button className="select-action">选择</button>
        <button aria-label="列表视图">
          <img src="/assets/history-list.svg" />
        </button>
        <button aria-label="展开">
          <img src="/assets/history-expand.svg" />
        </button>
      </div>
      <div className="figma-history-tabs">
        {(["海报", "直播间", "PPT"] as const).map((item) => (
          <button
            key={item}
            className={tab === item ? "active" : ""}
            onClick={() => setTab(item)}
          >
            {item}
          </button>
        ))}
      </div>
      <div className="figma-history-search">
        <img src="/assets/history-search.svg" />
        <span>搜索</span>
      </div>
      <h3>2026-08-03</h3>
      <div className="figma-history-cards">
        {[0, 1].map((i) => (
          <button
            className="figma-history-card"
            draggable
            onDragStart={(event) => {
              event.dataTransfer.effectAllowed = "copy";
              event.dataTransfer.setData("application/x-canvas-asset", JSON.stringify({
                name: "小学全科卡",
                url: "/assets/template-" + (i + 2) + ".png",
              }));
            }}
            key={i}
          >
            <div className="history-image-area"><img src={`/assets/template-${i + 2}.png`} alt="历史图片缩略图" /></div>
            <strong>小学全科卡</strong>
            <small>图片 · 今天</small>
          </button>
        ))}
      </div>
    </aside>
  );
}

function History({
  onEdit,
  onBack,
  onCanvas,
}: {
  onEdit: () => void;
  onBack: () => void;
  onCanvas: (image?: string, name?: string) => void;
}) {
  const [tab] = useState<"subject" | "canvas">("canvas");
  const [popup, setPopup] = useState<"filter" | "time" | "sort" | null>(null);
  const [filter, setFilter] = useState("操作");
  const [time, setTime] = useState("全部");
  const [order, setOrder] = useState("近-远");
  const [sortBy, setSortBy] = useState("修改时间");
  const [zoom, setZoom] = useState(42);
  const [batch, setBatch] = useState(false);
  const [selectedHistory, setSelectedHistory] = useState<string[]>([]);
  const [favoriteHistory, setFavoriteHistory] = useState<string[]>([]);
  const [cards, setCards] = useState([
    "夏日新品预热海报",
    "课程价格板设计",
    "新品种草海报",
    "直播间活动主视觉",
  ]);
  const [subjectOpen, setSubjectOpen] = useState(false);
  const [subjectClosing, setSubjectClosing] = useState(false);
  const [subjectName, setSubjectName] = useState("");
  const [subjectDescription, setSubjectDescription] = useState("");
  const [subjectPreview, setSubjectPreview] = useState<string | null>(null);
  const subjectFile = useRef<HTMLInputElement>(null);
  const choose = (kind: "filter" | "time" | "sort") =>
    setPopup((v) => (v === kind ? null : kind));
  return (
    <section className="history-page" onClick={() => popup && setPopup(null)}>
      <div className="history-heading">
        <button
          className="history-heading-back"
          onClick={onBack}
          aria-label="返回首页"
        >
          <img src="/assets/history-back.svg" />
        </button>
        <h1>生成历史</h1>
      </div>
      <div className="history-workspace">
        <div className="history-top-row">
          <div className="history-tabs"><button className="active">画布</button></div>
          <div className="history-top-actions">
            <label className="history-zoom">
              <input
                type="range"
                min="10"
                max="100"
                value={zoom}
                onChange={(e) => setZoom(Number(e.target.value))}
              />
            </label>
            {batch ? (
              <div className="history-batch-actions">
                <span>已选择 {selectedHistory.length} 项内容</span>
                <button
                  disabled={!selectedHistory.length}
                  onClick={() => {
                    setCards((items) => items.filter((name) => !selectedHistory.includes(name)));
                    setSelectedHistory([]);
                  }}
                >♜ 删除</button>
                <button
                  disabled={!selectedHistory.length}
                  onClick={() => {
                    setFavoriteHistory((items) => [...new Set([...items, ...selectedHistory])]);
                    setSelectedHistory([]);
                  }}
                >☆ 收藏</button>
                <i />
                <button className="history-cancel-batch" onClick={() => { setBatch(false); setSelectedHistory([]); }}>× 取消选择</button>
              </div>
            ) : (
              <button className="history-batch" onClick={() => setBatch(true)}>
                <img src="/assets/history-search.svg" /><i />批量选择
              </button>
            )}
          </div>
        </div>
        <div className="history-filter-row">
          <button className="current">全部</button>
          <div className="history-filter-anchor">
            <button
              onClick={(e) => {
                e.stopPropagation();
                choose("filter");
              }}
            >
              筛选
            </button>
            {popup === "filter" && (
              <div
                className="history-pop filter-pop"
                onClick={(e) => e.stopPropagation()}
              >
                {["操作", "收藏"].map((v) => (
                  <button
                    className={filter === v ? "selected" : ""}
                    onClick={() => {
                      setFilter(v);
                      setPopup(null);
                    }}
                    key={v}
                  >
                    {v}
                    {filter === v && <b>✓</b>}
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="history-filter-anchor">
            <button
              onClick={(e) => {
                e.stopPropagation();
                choose("time");
              }}
            >
              时间
            </button>
            {popup === "time" && (
              <div
                className="history-pop time-pop"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="history-date-row">
                  <button>
                    开始日期 <span>▣</span>
                  </button>
                  <button>
                    26-08-17 <span>▣</span>
                  </button>
                </div>
                {["全部", "最近一周", "最近一个月", "最近三个月"].map((v) => (
                  <button
                    className={time === v ? "selected" : ""}
                    onClick={() => {
                      setTime(v);
                      setPopup(null);
                    }}
                    key={v}
                  >
                    {v}
                    {time === v && <b>✓</b>}
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="history-filter-anchor">
            <button
              onClick={(e) => {
                e.stopPropagation();
                choose("sort");
              }}
            >
              排序
            </button>
            {popup === "sort" && (
              <div
                className="history-pop sort-pop"
                onClick={(e) => e.stopPropagation()}
              >
                <strong>顺序</strong>
                {["近-远", "远-近"].map((v) => (
                  <button
                    className={order === v ? "selected" : ""}
                    onClick={() => setOrder(v)}
                    key={v}
                  >
                    {v}
                    {order === v && <b>✓</b>}
                  </button>
                ))}
                <hr />
                <strong>排序方式</strong>
                {["修改时间", "创建时间"].map((v) => (
                  <button
                    className={sortBy === v ? "selected" : ""}
                    onClick={() => setSortBy(v)}
                    key={v}
                  >
                    {v}
                    {sortBy === v && <b>✓</b>}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
        <div className="history-cards">
          <button
            className="history-record history-create-record"
            onClick={tab === "subject" ? () => setSubjectOpen(true) : () => onCanvas()}
          >
            <div className="history-record-preview"><span>＋</span></div>
            <strong>{tab === "subject" ? "新建主体" : "新建画布"}</strong>
          </button>
          {cards.map((name, i) => {
            const image = `/assets/template-${(i % 5) + 1}.png`;
            const favorite = favoriteHistory.includes(name);
            return (
              <div className="history-record-shell" key={name}>
                <button
                  className={`history-record ${batch ? "batching" : ""}`}
                  onClick={() => {
                    if (batch) {
                      setSelectedHistory((items) =>
                        items.includes(name) ? items.filter((item) => item !== name) : [...items, name],
                      );
                    } else if (tab === "subject") {
                      setSubjectName(name);
                      setSubjectDescription("");
                      setSubjectPreview(samples[i % samples.length]);
                      setSubjectOpen(true);
                    } else onCanvas(image, name);
                  }}
                >
                  <div className="history-record-preview">
                    {tab === "subject" && <img src={samples[i % samples.length]} alt={name} />}
                    {tab === "canvas" && <img src={image} alt={name} />}
                    {batch && (
                      <i className={`batch-check ${selectedHistory.includes(name) ? "selected" : ""}`}>
                        {selectedHistory.includes(name) ? "✓" : ""}
                      </i>
                    )}
                  </div>
                  <strong>{name}</strong>
                  {i > 0 && <small>{i === 1 ? "编辑于 6 分钟前" : "编辑于 17 小时前"}</small>}
                </button>
                <button
                  className={`history-pin ${favorite ? "active" : ""}`}
                  aria-label={favorite ? `取消置顶${name}` : `置顶${name}`}
                  onClick={() => setFavoriteHistory((items) => favorite ? items.filter((item) => item !== name) : [...items, name])}
                ><span>置顶</span>★</button>
              </div>
            );
          })}
        </div>
      </div>
      {subjectOpen && (
        <div className="history-subject-backdrop">
          <section className={`history-subject-dialog ${subjectClosing ? "is-closing" : ""}`} role="dialog" aria-modal="true" aria-labelledby="subject-dialog-title">
            <header>
              <h2 id="subject-dialog-title">设置主体 <small>ⓘ</small></h2>
              <button
                aria-label="关闭"
                onPointerDown={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  setSubjectClosing(true);
                  window.setTimeout(() => {
                    setSubjectOpen(false);
                    setSubjectClosing(false);
                  }, 120);
                }}
              >×</button>
            </header>
            <label>参考主体 <b>*</b></label>
            <div className="history-subject-upload">
              {subjectPreview ? (
                <div className="history-subject-preview-row">
                  <img src={subjectPreview} alt="主体预览" />
                  <button aria-label="上传替换主体图片" onClick={() => subjectFile.current?.click()}>▧＋</button>
                </div>
              ) : (
                <>
                  <span className="history-upload-symbol">⇧</span>
                  <p>上传主图，将素材拖拽至此处或从以下选择</p>
                  <div>
                    <button onClick={() => subjectFile.current?.click()}>⇧ 从本地添加</button>
                    <button onClick={() => subjectFile.current?.click()}>▣ 从资产添加</button>
                  </div>
                </>
              )}
            </div>
            <label>名称 <b>*</b></label>
            <div className="history-subject-input">
              <input maxLength={20} value={subjectName} onChange={(e) => setSubjectName(e.target.value)} placeholder="请输入名称" />
              <span>{subjectName.length}/20</span>
            </div>
            <label>描述</label>
            <textarea value={subjectDescription} onChange={(e) => setSubjectDescription(e.target.value)} placeholder="请输入描述" />
            <footer>
              <button
                disabled={!subjectName.trim() || !subjectPreview}
                onClick={() => {
                  setCards((items) => [subjectName.trim(), ...items]);
                  setSubjectOpen(false);
                  setSubjectName("");
                  setSubjectDescription("");
                  setSubjectPreview(null);
                }}
              >保存</button>
            </footer>
            <input
              ref={subjectFile}
              hidden
              type="file"
              accept="image/*"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) setSubjectPreview(URL.createObjectURL(file));
                e.currentTarget.value = "";
              }}
            />
          </section>
        </div>
      )}
    </section>
  );
}

function Assets({
  folders,
  setFolders,
  onBack,
  onSendToCanvas,
}: {
  folders: string[];
  setFolders: (v: string[]) => void;
  onBack: () => void;
  onSendToCanvas: (item: { name: string; url: string; category?: "assets" | "live" }) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploaded, setUploaded] = useState<{ name: string; url: string; category: "assets" | "live" }[]>([
    { name: "孩子开学抢跑必备神器", url: "/assets/school-kickoff-poster.png", category: "assets" },
    { name: "达人合作蓝色背景", url: "/assets/live-collaboration-blue.png", category: "live" },
  ]);
  const [tab, setTab] = useState<"subject" | "assets" | "kt" | "live">("subject");
  const [subjectOpen, setSubjectOpen] = useState(false);
  const [subjectName, setSubjectName] = useState("");
  const [subjectImages, setSubjectImages] = useState<string[]>([]);
  const [subjects, setSubjects] = useState(["夏日新品预热海报", "课程价格板设计", "新品种草海报", "直播间活动主视觉"]);
  const [favoriteAssets, setFavoriteAssets] = useState<string[]>([]);
  const subjectFile = useRef<HTMLInputElement>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [folderMenu, setFolderMenu] = useState(false);
  const [assetContext, setAssetContext] = useState<{ x: number; y: number; item: { name: string; url: string; category: "assets" | "live" } } | null>(null);
  useEffect(() => {
    const dismiss = () => {
      setAddOpen(false);
      setFolderMenu(false);
      setAssetContext(null);
    };
    document.addEventListener("dismiss-popovers", dismiss);
    return () => document.removeEventListener("dismiss-popovers", dismiss);
  }, []);
  const addFolder = () => {
    setFolders([...folders, `新建文件夹 ${folders.length + 1}`]);
    setTab("assets");
    setAddOpen(false);
    setFolderMenu(false);
  };
  const uploadFile = (file?: File) => {
    if (file)
      setUploaded([
        { name: file.name, url: URL.createObjectURL(file), category: tab === "live" ? "live" : "assets" },
        ...uploaded,
      ]);
    setAddOpen(false);
  };
  const activeAssets = uploaded
    .filter((item) => item.category === (tab === "live" ? "live" : "assets"))
    .sort((a, b) => Number(favoriteAssets.includes(b.url)) - Number(favoriteAssets.includes(a.url)));
  const empty = activeAssets.length === 0;
  return (
    <section className="asset-page-figma">
      <header className="asset-page-header">
        <div>
          <button
            className="asset-page-back"
            onClick={onBack}
            aria-label="返回首页"
          >
            <img src="/assets/history-back.svg" />
          </button>
          <strong>素材库</strong>
        </div>
      </header>
      <nav className="asset-page-tabs">
        <button
          className={tab === "subject" ? "active" : ""}
          onClick={() => {
            setTab("subject");
            setFolderMenu(false);
          }}
        >
          人物
        </button>
        <button
          className={tab === "assets" ? "active" : ""}
          onClick={() => {
            setTab("assets");
            setFolderMenu(false);
            setAddOpen(false);
          }}
        >
          海报
        </button>
        <button
          className={tab === "kt" ? "active" : ""}
          onClick={() => {
            setTab("kt");
            setFolderMenu(false);
            setAddOpen(false);
          }}
        >
          KT板
        </button>
        <button
          className={tab === "live" ? "active" : ""}
          onClick={() => {
            setTab("live");
            setFolderMenu(false);
            setAddOpen(false);
          }}
        >
          直播间
        </button>
      </nav>
      {folderMenu && (
        <div className="asset-folder-menu">
          <button className="selected" onClick={addFolder}>
            <span>＋</span>新建文件夹
          </button>
          <button>
            <span>✎</span>重命名
          </button>
          <button>
            <span>□</span>移动到
          </button>
          <button>
            <span>↥</span>创建副本
          </button>
          <button>
            <span>⇩</span>下载
          </button>
          <button>
            <span>♙</span>删除
          </button>
        </div>
      )}
      {tab === "subject" ? (
        <div className="asset-subject-grid">
          <button className="asset-subject-card create" onClick={() => { setSubjectName(""); setSubjectImages([]); setSubjectOpen(true); }}>
            <div className="asset-create-single" aria-hidden="true"><i>＋</i></div>
            <strong>新建主体</strong>
          </button>
          {subjects.map((name, i) => (
            <button className="asset-subject-card" key={name} onClick={() => { setSubjectName(name); setSubjectImages([samples[i % samples.length]]); setSubjectOpen(true); }}>
              <div><img src={samples[i % samples.length]} alt={name} /></div><strong>{name}</strong><small>主体 · 最近修改</small>
            </button>
          ))}
        </div>
      ) : tab === "kt" || empty ? (
        <div className="asset-empty">
          <img src="/assets/dog-search-none.png" />
          <p>暂无内容，快去创建吧</p>
          <div>
            <button onClick={addFolder}>
              <span>▣</span>创建文件夹
            </button>
            <button onClick={() => fileRef.current?.click()}>
              <span>＋</span>创建设计
            </button>
          </div>
        </div>
      ) : (
        <div className="asset-content-grid">
          <button
            className="asset-upload-entry"
            onClick={() => fileRef.current?.click()}
            aria-label={tab === "live" ? "上传直播间素材" : "上传海报素材"}
          >
            <div className="asset-create-single" aria-hidden="true"><i>＋</i></div>
            <strong>{tab === "live" ? "上传直播间素材" : "上传海报"}</strong>
          </button>
          {activeAssets.map((item) => (
            <div className="asset-content-card" key={item.url} onContextMenu={(event)=>{event.preventDefault();event.stopPropagation();setAssetContext({x:Math.min(event.clientX,window.innerWidth-304),y:Math.min(event.clientY,window.innerHeight-330),item});}}>
              <button className="asset-content-open" onClick={() => onSendToCanvas(item)}>
                <img src={item.url} alt={item.name} />
                <strong>{item.name}</strong>
                <small>刚刚上传</small>
              </button>
              <button
                className={`asset-pin ${favoriteAssets.includes(item.url) ? "active" : ""}`}
                aria-label={favoriteAssets.includes(item.url) ? `取消置顶${item.name}` : `置顶${item.name}`}
                onClick={(event) => {
                  event.stopPropagation();
                  setFavoriteAssets((items) => items.includes(item.url) ? items.filter((url) => url !== item.url) : [...items, item.url]);
                }}
              ><span>置顶</span>★</button>
            </div>
          ))}
        </div>
      )}
      {assetContext && <div className="asset-context-menu" style={{left:assetContext.x,top:assetContext.y}} onClick={(event)=>event.stopPropagation()}>
        <button className="primary-action" onClick={()=>onSendToCanvas(assetContext.item)}><span>＋</span>发送到画布</button>
        <button onClick={()=>{const name=window.prompt("请输入新名称",assetContext.item.name)?.trim();if(name)setUploaded((items)=>items.map((item)=>item.url===assetContext.item.url?{...item,name}:item));setAssetContext(null);}}><span>✎</span>重命名</button>
        <button onClick={()=>{const link=document.createElement("a");link.href=assetContext.item.url;link.download=`${assetContext.item.name}.png`;link.click();setAssetContext(null);}}><span>⇩</span>下载</button>
        <button onClick={()=>{setUploaded((items)=>items.filter((item)=>item.url!==assetContext.item.url));setAssetContext(null);}}><span>♙</span>删除</button>
      </div>}
      <input
        ref={fileRef}
        hidden
        type="file"
        accept="image/*"
        onChange={(e) => uploadFile(e.target.files?.[0])}
      />
      {subjectOpen && (
        <div className="history-subject-backdrop">
          <section className="history-subject-dialog" role="dialog" aria-modal="true" aria-labelledby="asset-subject-title">
            <header><h2 id="asset-subject-title">设置主体 <small>ⓘ</small></h2><button aria-label="关闭" onClick={() => setSubjectOpen(false)}>×</button></header>
            <label>参考主体 <b>*</b></label>
            <div className={`history-subject-upload ${subjectImages.length ? "has-preview" : ""}`}>
              {subjectImages.length ? <><img src={subjectImages[0]} alt="主体预览" /><button aria-label="添加新的主体图片" onClick={() => subjectFile.current?.click()}>▧＋</button></> : <><span className="history-upload-symbol">⇧</span><p>上传主图，将素材拖拽至此处</p><button onClick={() => subjectFile.current?.click()}>⇧ 从本地添加</button></>}
            </div>
            <label>名称 <b>*</b></label>
            <div className="history-subject-input"><input maxLength={20} value={subjectName} onChange={(e) => setSubjectName(e.target.value)} placeholder="请输入名称" /><span>{subjectName.length}/20</span></div>
            <label>描述</label><textarea placeholder="请输入描述" />
            <footer><button disabled={!subjectName.trim() || !subjectImages.length} onClick={() => { const name = subjectName.trim(); if (!subjects.includes(name)) setSubjects((items) => [name, ...items]); setSubjectOpen(false); }}>保存</button></footer>
            <input ref={subjectFile} hidden multiple type="file" accept="image/*" onChange={(e) => { const files=Array.from(e.target.files || []); if(files.length) setSubjectImages((items) => [...items,...files.map((file)=>URL.createObjectURL(file))]); e.currentTarget.value=""; }} />
          </section>
        </div>
      )}
    </section>
  );
}

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);

