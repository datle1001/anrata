import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useChat } from "@ai-sdk/react";
import {
  DefaultChatTransport,
  lastAssistantMessageIsCompleteWithToolCalls,
  type UIMessage,
} from "ai";
import { useServerFn } from "@tanstack/react-start";
import { useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { X, Minus, LogOut, LogIn, Download, Plus } from "lucide-react";
import { OmaLogo, OmaName } from "@/components/oma-identity";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/lib/oma/session";
import { getOmaHistory, recordOmaAction, resetOmaHistory } from "@/lib/oma/history.functions";
import { validateCommand, type WorkspaceCommand } from "@/lib/oma/workspace";
import { Button } from "@/components/ui/button";
import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import { Message, MessageContent, MessageResponse } from "@/components/ai-elements/message";
import {
  PromptInput,
  PromptInputTextarea,
  PromptInputFooter,
  PromptInputSubmit,
} from "@/components/ai-elements/prompt-input";
import { Shimmer } from "@/components/ai-elements/shimmer";
import { downloadText } from "@/lib/review";
import { guestKeys, guestMessages, recordGuestAction } from "@/lib/oma/guest-storage";
import { guestPublicationToken } from "@/lib/publication-access";

export function OmaPanel({
  onClose,
  onMinimize,
  onDragStart,
  onCommand,
  workspace,
}: {
  onClose: () => void;
  onMinimize?: () => void;
  onDragStart?: (e: React.PointerEvent) => void;
  onCommand: (c: WorkspaceCommand) => unknown;
  workspace: unknown;
}) {
  const user = useSession();
  const load = useServerFn(getOmaHistory);
  const [history, setHistory] = useState<UIMessage[] | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    setHistory(null);
    setError("");
    if (!user) {
      setHistory(guestMessages(localStorage));
      return;
    }
    let active = true;
    void load()
      .then((h) => {
        if (active) setHistory(h as unknown as UIMessage[]);
      })
      .catch((e) => {
        if (active) setError(e.message);
      });
    return () => {
      active = false;
    };
  }, [load, user]);
  return (
    <aside aria-label="Oma copilot" className="oma-panel bg-card text-foreground">
      <OmaLogo className="oma-watermark" />
      <div
        onPointerDown={onDragStart}
        className="flex h-14 shrink-0 cursor-grab touch-none select-none items-center gap-3 border-b border-border px-4 active:cursor-grabbing"
      >
        <div>
          <h2 className="text-xl font-semibold">
            <OmaName />
          </h2>
          <p className="text-xs text-muted-foreground">Spectrum coordination copilot</p>
        </div>
        {onMinimize && (
          <Button
            className="ml-auto"
            size="icon-sm"
            variant="ghost"
            aria-label="Minimize Oma"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={onMinimize}
          >
            <Minus />
          </Button>
        )}
        <Button
          className={onMinimize ? "" : "ml-auto"}
          size="icon-sm"
          variant="ghost"
          onPointerDown={(e) => e.stopPropagation()}
          aria-label="Close Oma"
          onClick={onClose}
        >
          <X />
        </Button>
      </div>
      {error ? (
        <div className="p-4 text-destructive">{error}</div>
      ) : history === null ? (
        <div className="p-4">
          <Shimmer>Loading conversation…</Shimmer>
        </div>
      ) : (
        <OmaChat
          key={user?.id ?? "guest"}
          initial={history}
          onCommand={onCommand}
          workspace={workspace}
        />
      )}
    </aside>
  );
}
function OmaChat({
  initial,
  onCommand,
  workspace,
}: {
  initial: UIMessage[];
  onCommand: (c: WorkspaceCommand) => unknown;
  workspace: unknown;
}) {
  const user = useSession();
  const queryClient = useQueryClient();
  const action = useServerFn(recordOmaAction);
  const resetHistory = useServerFn(resetOmaHistory);
  const textarea = useRef<HTMLTextAreaElement>(null);
  const workspaceRef = useRef(workspace);
  workspaceRef.current = workspace;
  const [input, setInput] = useState("");
  const [failure, setFailure] = useState("");
  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/public/oma",
        body: () => ({ workspace: workspaceRef.current, uploadToken: guestPublicationToken() }),
        headers: async () => {
          const { data } = await supabase.auth.getSession();
          return data.session ? { Authorization: `Bearer ${data.session.access_token}` } : {};
        },
      }),
    [],
  );
  const { messages, sendMessage, status, stop, addToolOutput, setMessages } = useChat({
    id: user?.id ?? "oma",
    messages: initial,
    transport,
    sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithToolCalls,
    onError: (e) => {
      setFailure(e.message);
      textarea.current?.focus();
    },
    onFinish: () => textarea.current?.focus(),
    onToolCall: async ({ toolCall }) => {
      if (toolCall.toolName !== "controlWorkspace") return;
      try {
        const command = validateCommand(toolCall.input as WorkspaceCommand);
        const result = onCommand(command);
        const evidence = { command, result, toolCallId: toolCall.toolCallId };
        if (user) await action({ data: { action: "workspace-control", evidence } });
        else recordGuestAction("workspace-control", evidence);
        addToolOutput({
          tool: "controlWorkspace",
          toolCallId: toolCall.toolCallId,
          output: { applied: true, result },
        });
      } catch (e) {
        addToolOutput({
          tool: "controlWorkspace",
          toolCallId: toolCall.toolCallId,
          state: "output-error",
          errorText: e instanceof Error ? e.message : "Action failed",
        });
      }
    },
  });
  const busy = status === "submitted" || status === "streaming";
  useEffect(() => {
    if (user) return;
    try {
      localStorage.setItem(guestKeys.messages, JSON.stringify(messages));
    } catch {
      setFailure("Browser storage is unavailable. This conversation will not survive refresh.");
    }
  }, [messages, user]);
  useEffect(() => {
    if (!busy) textarea.current?.focus();
  }, [busy]);
  const send = useCallback(
    (text: string) => {
      if (!text.trim() || busy) return;
      setFailure("");
      void sendMessage({ text });
      setInput("");
      textarea.current?.focus();
    },
    [busy, sendMessage],
  );
  return (
    <>
      <div className="flex items-center justify-between border-b border-border px-4 py-2 text-xs text-muted-foreground">
        <span>
          {user ? "Account conversation" : "Guest · saved in this browser"} · {messages.length}{" "}
          messages
        </span>
        <div className="flex">
          <Button
            size="icon-sm"
            variant="ghost"
            title="New chat"
            aria-label="New chat"
            disabled={busy}
            onClick={async () => {
              try {
                if (user) await resetHistory();
                else localStorage.setItem(guestKeys.messages, "[]");
                setMessages([]);
                setInput("");
                setFailure("");
                textarea.current?.focus();
              } catch (e) {
                setFailure(e instanceof Error ? e.message : "Could not start a new chat.");
              }
            }}
          >
            <Plus />
          </Button>
          <Button
            size="icon-sm"
            variant="ghost"
            title="Export conversation"
            aria-label="Export conversation"
            onClick={() =>
              downloadText(
                JSON.stringify(messages, null, 2),
                "oma-conversation.json",
                "application/json",
              )
            }
          >
            <Download />
          </Button>
          {user ? (
            <Button
              size="icon-sm"
              variant="ghost"
              title="Sign out"
              aria-label="Sign out"
              onClick={async () => {
                await queryClient.cancelQueries();
                queryClient.clear();
                await supabase.auth.signOut();
                toast.success("Signed out");
              }}
            >
              <LogOut />
            </Button>
          ) : (
            <Button
              asChild
              size="icon-sm"
              variant="ghost"
              title="Sign in (optional)"
              aria-label="Sign in (optional)"
            >
              <Link to="/auth">
                <LogIn />
              </Link>
            </Button>
          )}
        </div>
      </div>
      <Conversation className="min-h-0 flex-1">
        <ConversationContent className="gap-5 p-4">
          {messages.length === 0 && (
            <div className="space-y-3 py-6">
              <OmaLogo className="size-14" />
              <h3 className="text-lg font-semibold">What needs your attention?</h3>
              {[
                "Show only red filings",
                "Compare the two highest screening margins",
                "Which evidence is missing for non-GSO filings?",
              ].map((text) => (
                <Button
                  key={text}
                  variant="outline"
                  className="h-auto w-full justify-start whitespace-normal py-3 text-left"
                  onClick={() => send(text)}
                >
                  {text}
                </Button>
              ))}
            </div>
          )}
          {messages
            .filter((message) => message.parts.some((p) => p.type === "text" && p.text.trim()))
            .map((message) => (
              <Message key={message.id} from={message.role}>
                <MessageContent className="w-full">
                  {message.parts.map((part, i) => {
                    if (part.type === "text")
                      return <MessageResponse key={i}>{part.text}</MessageResponse>;
                    return null;
                  })}
                </MessageContent>
              </Message>
            ))}
          {busy && <Shimmer>Checking evidence…</Shimmer>}
        </ConversationContent>
        <ConversationScrollButton />
      </Conversation>
      {failure && (
        <p role="alert" className="px-4 py-2 text-sm text-destructive">
          {failure}
        </p>
      )}
      <div className="shrink-0 border-t border-border p-2">
        <PromptInput
          className="[&_[data-slot=input-group]]:flex-row [&_[data-slot=input-group]]:items-end"
          onSubmit={({ text }) => send(text)}
        >
          <PromptInputTextarea
            ref={textarea}
            autoFocus
            aria-label="Ask Oma"
            placeholder="Ask Oma about a filing or comparison…"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            rows={1}
            className="min-h-10 max-h-28 overflow-y-auto py-2 text-sm"
          />
          <PromptInputFooter className="w-auto shrink-0 p-1.5">
            <PromptInputSubmit
              status={status}
              onStop={() => void stop()}
              disabled={!busy && !input.trim()}
            />
          </PromptInputFooter>
        </PromptInput>
      </div>
    </>
  );
}
