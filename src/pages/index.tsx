import fs from "fs";
import path from "path";

import React, { useRef, useState } from "react";
import { Play, Terminal, FileInput, Loader2 } from "lucide-react";
import { HeaderTypes, Nullable } from "@/types";

type Languages = "SHSC";

interface Template {
  name: string;
  extension: string;
  template: string;
}

interface Example {
  value: string;
  label: string;
  code?: string;
}

const LanguageTemplates: Record<Languages, Template> = {
  SHSC: {
    name: "Shsc",
    extension: ".shsc",
    template: 'module main\n\nproc main()\n    io:println("Hello World!")\nend\n',
  },
};

interface Tab {
  id: number;
  name: string;
  content: string;
}

interface ExecResult {
  code?: Nullable<string | number>;
  stdout?: Nullable<string>;
  stderr?: Nullable<string>;
}

export function getStaticProps(): { props: StaticProps } {
  const shscDir = path.join(process.cwd(), "public", "examples", "shsc");
  const files = fs.readdirSync(shscDir).filter((f: string) => f.endsWith(".shsc"));

  const examplesList = files.map<Example>((file: string) => {
    const value = file.replace(/\.shsc$/, "");
    const code = fs.readFileSync(path.join(shscDir, file), "utf8");
    const label = value
      .split("_")
      .map((w: string) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ");

    return { value, label, code };
  });

  const defaultSelection = { value: "", label: "Select Example...", code: "" };

  return {
    props: {
      examples: {
        SHSC: [defaultSelection, ...examplesList],
      },
    },
  };
}

interface StaticProps {
  examples: Record<Languages, Example[]>;
}

export default function CodeEditor({ examples }: StaticProps): React.ReactNode {
  const [language, setLanguage] = useState<Languages>("SHSC");

  const [tabs, setTabs] = useState<Tab[]>([
    { id: 1, name: `main${LanguageTemplates.SHSC.extension}`, content: LanguageTemplates.SHSC.template },
  ]);

  const [activeTab, setActiveTab] = useState(1);
  const [consoleMode, setConsoleMode] = useState<"input" | "output">("input");
  const [stdinInput, setStdinInput] = useState("");
  const [output, setOutput] = useState<Nullable<ExecResult>>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [editingTabId, setEditingTabId] = useState<Nullable<number>>(null);
  const [editingTabName, setEditingTabName] = useState("");
  const [selectedExample, setSelectedExample] = useState("");

  const codeTextareaRef = useRef<HTMLTextAreaElement>(null);
  const stdinTextareaRef = useRef<HTMLTextAreaElement>(null);

  const currentExamples = examples[language];

  function handleLanguageChange(newLang: Languages) {
    setLanguage(newLang);
    setSelectedExample("");
    // Create new tab with template for the selected language
    setTabs([
      {
        id: 1,
        name: `main${LanguageTemplates[newLang].extension}`,
        content: LanguageTemplates[newLang].template,
      },
    ]);
    setActiveTab(1);
  }

  function handleTabDoubleClick(tab: Tab) {
    setEditingTabId(tab.id);
    setEditingTabName(tab.name);
  }

  const handleTabNameChange = () => {
    if (editingTabName.trim() !== "") {
      setTabs(tabs.map((tab) => (tab.id === editingTabId ? { ...tab, name: editingTabName.trim() } : tab)));
    }
    setEditingTabId(null);
  };

  function handleContentChange(content: string) {
    setTabs(tabs.map((tab) => (tab.id === activeTab ? { ...tab, content } : tab)));
  }

  function handleTabKeyDown(e: React.KeyboardEvent, ref: React.RefObject<HTMLTextAreaElement | null>) {
    const TAB_SIZE = 4;

    if (e.key === "Tab" && !e.shiftKey) {
      if (ref.current == null) return;

      e.preventDefault();

      const value = ref.current.value;
      const selectionStart = ref.current.selectionStart;
      const selectionEnd = ref.current.selectionEnd;
      ref.current.value = value.substring(0, selectionStart) + " ".repeat(TAB_SIZE) + value.substring(selectionEnd);
      ref.current.selectionStart = selectionEnd + TAB_SIZE - (selectionEnd - selectionStart);
      ref.current.selectionEnd = selectionEnd + TAB_SIZE - (selectionEnd - selectionStart);
    }

    if (e.key === "Tab" && e.shiftKey) {
      if (ref.current == null) return;

      e.preventDefault();

      const value = ref.current.value;
      const selectionStart = ref.current.selectionStart;
      const selectionEnd = ref.current.selectionEnd;

      const beforeStart = value.substring(0, selectionStart).split("").reverse().join("");
      const indexOfTab = beforeStart.indexOf(" ".repeat(TAB_SIZE));
      const indexOfNewline = beforeStart.indexOf("\n");

      if (indexOfTab !== -1 && indexOfTab < indexOfNewline) {
        ref.current.value =
          beforeStart
            .substring(indexOfTab + TAB_SIZE)
            .split("")
            .reverse()
            .join("") +
          beforeStart.substring(0, indexOfTab).split("").reverse().join("") +
          value.substring(selectionEnd);

        ref.current.selectionStart = selectionStart - 2;
        ref.current.selectionEnd = selectionEnd - TAB_SIZE;
      }
    }
  }

  function addNewTab() {
    const newId = Math.max(...tabs.map((t) => t.id), 0) + 1;
    const newTab = {
      id: newId,
      name: `file${newId}${LanguageTemplates[language].extension}`,
      content: "",
    };
    setTabs([...tabs, newTab]);
    setActiveTab(newId);
  }

  function closeTab(id: number) {
    if (tabs.length === 1) return;
    const newTabs = tabs.filter((tab) => tab.id !== id);
    setTabs(newTabs);
    if (activeTab === id && newTabs[0] != null) {
      setActiveTab(newTabs[0].id);
    }
  }

  async function handleRun() {
    setIsRunning(true);
    setConsoleMode("output");
    setOutput(null);

    try {
      // TODO: multi-file runtime
      // const formData = new FormData();

      // tabs.forEach((tab) => {
      //   const blob = new Blob([tab.content], { type: "text/plain" });
      //   formData.append("files", blob, tab.name);
      // });

      // formData.append("stdin", stdinInput);
      // formData.append("language", language);

      // const response = await fetch("/api/v1/script/run", {
      //   method: "POST",
      //   body: formData,
      // });

      const body = {
        stdin: stdinInput + "\n",
        code: tabs[0]?.content,
      };

      const response = await fetch("/api/v1/script/run", {
        method: "POST",
        headers: {
          [HeaderTypes.CONTENT_TYPE]: "application/json",
        },
        body: JSON.stringify(body),
      });

      const result: unknown = await response.json();
      if (!response.ok) {
        setOutput({ code: `HTTP ${response.status}`, stderr: (result as Error).message });
      } else {
        setOutput(result as ExecResult);
      }
    } catch (e) {
      const error = e as Error;
      setOutput({ code: "Fetch Error", stderr: `Error: ${error.message}` });
    } finally {
      setIsRunning(false);
    }
  }

  function handleExampleChange(value: string) {
    setSelectedExample(value);
    const example = currentExamples.find((ex: { value: string }) => ex.value === value);
    if (example != null && example.code != null) {
      setTabs([
        {
          id: 1,
          name: `main${LanguageTemplates[language].extension}`,
          content: example.code,
        },
      ]);
      setActiveTab(1);
    }
  }

  const activeTabContent = tabs.find((t) => t.id === activeTab)?.content ?? "";

  return (
    <div className="flex flex-col h-screen bg-gray-900 text-gray-100">
      {/* Top Bar */}
      <div className="flex items-center gap-2 p-2 bg-gray-800 border-b border-gray-700">
        <select
          value={language}
          onChange={(e) => handleLanguageChange(e.target.value as Languages)}
          className="flex items-center gap-2 px-3 py-1 bg-gray-700 border border-gray-600
            rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {Object.entries(LanguageTemplates).map(([key, lang]) => (
            <option key={key} value={key}>
              {lang.name}
            </option>
          ))}
        </select>

        <div className="flex-1" />

        <select
          value={selectedExample}
          onChange={(e) => handleExampleChange(e.target.value)}
          className="px-3 py-1 bg-gray-700 border border-gray-600
            rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {currentExamples.map((ex) => (
            <option key={ex.value} value={ex.value}>
              {ex.label}
            </option>
          ))}
        </select>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-row max-[700px]:flex-col overflow-hidden">
        {/* Editor Section */}
        <div className="min-[700px]:w-[60%] max-[700px]:h-[60%] flex flex-col border-r border-gray-700">
          {/* Tab Bar */}
          <div className="flex items-center gap-1 p-1.5 bg-gray-800 border-b border-gray-700 overflow-x-auto">
            {tabs.map((tab) => (
              <div
                key={tab.id}
                className={`flex items-center gap-2 px-3 py-1.5 rounded text-sm select-none ${
                  activeTab === tab.id ? "bg-gray-900 text-white" : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                }`}
              >
                <span
                  onDoubleClick={() => handleTabDoubleClick(tab)}
                  onClick={() => setActiveTab(tab.id)}
                  className="cursor-pointer"
                >
                  {tab.name}
                </span>
                {tabs.length > 1 && (
                  <button onClick={() => closeTab(tab.id)} className="text-gray-400 hover:text-white">
                    ×
                  </button>
                )}
              </div>
            ))}
            <button onClick={addNewTab} className="px-2 py-1 text-gray-400 hover:text-white text-lg">
              +
            </button>
          </div>

          {/* Code Editor */}
          <textarea
            ref={codeTextareaRef}
            value={activeTabContent}
            onKeyDown={(e) => handleTabKeyDown(e, codeTextareaRef)}
            onChange={(e) => handleContentChange(e.target.value)}
            className="flex-1 p-4 bg-gray-900 text-gray-100 font-mono text-sm resize-none focus:outline-none"
            spellCheck={false}
            placeholder="Write your code here..."
          />
        </div>

        {/* Console Section */}
        <div className="min-[700px]:w-[40%] max-[700px]:h-[40%] flex flex-col bg-gray-900">
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="flex-1 flex flex-col">
              {/* Input and Output switcher buttons */}
              <div className="p-2 bg-gray-800 border-b border-gray-700 text-sm font-medium">
                <div className="flex gap-1">
                  <button
                    onClick={() => setConsoleMode("input")}
                    className={`flex items-center gap-1 px-3 py-1.5 cursor-pointer rounded text-sm ${
                      consoleMode === "input" ? "bg-blue-600 text-white" : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                    }`}
                  >
                    <FileInput size={16} />
                    Input
                  </button>

                  <button
                    onClick={() => setConsoleMode("output")}
                    className={`flex items-center gap-1 px-3 py-1.5 cursor-pointer rounded text-sm ${
                      consoleMode === "output"
                        ? "bg-blue-600 text-white"
                        : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                    }`}
                  >
                    <Terminal size={16} />
                    Output
                  </button>

                  <div className="flex-1" />

                  {/* Run Button */}
                  <button
                    onClick={() => void handleRun()}
                    disabled={isRunning}
                    className="flex items-center gap-2 px-4 py-1.5 bg-green-600 hover:bg-green-700
                      disabled:bg-gray-600 disabled:cursor-not-allowed rounded cursor-pointer
                      text-sm font-medium transition-colors"
                  >
                    {isRunning ? (
                      <>
                        <Loader2 size={16} className="animate-spin" />
                        Running...
                      </>
                    ) : (
                      <>
                        <Play size={16} />
                        Run
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* stdin */}
              {consoleMode === "input" ? (
                <textarea
                  value={stdinInput}
                  ref={stdinTextareaRef}
                  onKeyDown={(e) => handleTabKeyDown(e, stdinTextareaRef)}
                  onChange={(e) => setStdinInput(e.target.value)}
                  className="flex-1 p-4 bg-gray-900 text-gray-100 font-mono text-sm resize-none focus:outline-none"
                  placeholder="Enter input for your program..."
                />
              ) : (
                <div className="flex-1 overflow-auto p-4 font-mono text-sm">
                  {isRunning ? (
                    <div className="flex items-center gap-2 text-gray-400">
                      <Loader2 size={16} className="animate-spin" />
                      Executing...
                    </div>
                  ) : output != null ? (
                    <>
                      {/* exit or error codes */}
                      <div className="mb-3 pb-2 border-b border-gray-700">
                        <span className="text-xs text-gray-500">Exit Code: </span>
                        <span className={output.code === 0 ? "text-green-400" : "text-red-500"}>{output.code}</span>
                      </div>

                      {/* stdout */}
                      {output.stdout != null && output.stdout !== "" && (
                        <div>
                          <div className="text-xs text-gray-500 mb-1">STDOUT:</div>
                          <pre className="text-white whitespace-pre-wrap mb-3 pb-2 border-b border-gray-700">
                            {output.stdout}
                          </pre>
                        </div>
                      )}

                      {/* stderr */}
                      {output.stderr != null && output.stderr !== "" && (
                        <div>
                          <div className="text-xs text-gray-500 mb-1">STDERR:</div>
                          <pre className="text-red-300 whitespace-pre-wrap">{output.stderr}</pre>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="text-gray-500">No output yet. Click Run to execute your code.</div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Tab Name Edit Modal */}
      {editingTabId != null && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 p-6 rounded-lg shadow-xl w-80">
            <h3 className="text-lg font-medium mb-4 select-none">Rename Tab</h3>
            <input
              type="text"
              value={editingTabName}
              onChange={(e) => setEditingTabName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleTabNameChange()}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600
                rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              autoFocus
            />
            <div className="flex gap-2 mt-4">
              <button
                onClick={handleTabNameChange}
                className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded cursor-pointer"
              >
                Save
              </button>
              <button
                onClick={() => setEditingTabId(null)}
                className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
