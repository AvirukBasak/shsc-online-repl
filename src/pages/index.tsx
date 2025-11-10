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

  const DOM_DIRECT_UPDATE_DELAY_MS = 100;

  const [activeTab, _setActiveTab] = useState(1);
  function setActiveTab(valueOrFn: number | ((oldValue: number) => number)): void {
    if (valueOrFn instanceof Function) {
      _setActiveTab(valueOrFn);
    } else {
      _setActiveTab(valueOrFn);
    }
    // a quick-and-dirty way to resize the editor textarea if value is updated programatically
    setTimeout(() => textareaAutoResize(editorTextareaRef, editorLineNoDivRef), DOM_DIRECT_UPDATE_DELAY_MS);
  }

  const [consoleMode, setConsoleMode] = useState<"input" | "output">("input");
  const [stdinInput, setStdinInput] = useState("");
  const [output, setOutput] = useState<Nullable<ExecResult>>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [editingTabId, setEditingTabId] = useState<Nullable<number>>(null);
  const [editingTabName, setEditingTabName] = useState("");
  const [selectedExample, setSelectedExample] = useState("");

  const activeTabContent = tabs.find((t) => t.id === activeTab)?.content ?? "";

  const editorTextareaRef = useRef<HTMLTextAreaElement>(null);
  const stdinTextareaRef = useRef<HTMLTextAreaElement>(null);

  const editorLineNoDivRef = useRef<HTMLDivElement>(null);
  const tabContainerDivRef = useRef<HTMLDivElement>(null);

  const currentExamples = examples[language];

  function handleTabScroll(e: React.WheelEvent<HTMLDivElement>) {
    // apparently this is a passive event listener
    // e.preventDefault();
    if (tabContainerDivRef.current == null) return;
    const scrollPos = tabContainerDivRef.current.scrollLeft + e.deltaY;
    tabContainerDivRef.current.scrollTo({ left: scrollPos, behavior: "smooth" });
  }

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

  function textareaAutoResize(
    refEditor: React.RefObject<HTMLTextAreaElement | null>,
    refLineNo: React.RefObject<HTMLDivElement | null>
  ) {
    if (refEditor.current == null) return;

    refEditor.current.style.width = "auto";
    refEditor.current.style.height = "auto";

    const scrollWidth = refEditor.current.scrollWidth + "px";
    const scrollHeight = refEditor.current.scrollHeight + "px";

    refEditor.current.style.width = scrollWidth;
    refEditor.current.style.height = scrollHeight;

    // set height to scrollHeight (plus a tiny buffer if you want)
    if (refLineNo.current == null) return;
    refLineNo.current.style.height = scrollHeight;
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

    // a quick-and-dirty way to scroll tab bar to right-most end on add button click
    if (tabContainerDivRef.current == null) return;
    setTimeout(() => {
      if (tabContainerDivRef.current == null) return;
      tabContainerDivRef.current.scrollTo({ left: tabContainerDivRef.current.scrollWidth, behavior: "smooth" });
    }, DOM_DIRECT_UPDATE_DELAY_MS);
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
    // a quick-and-dirty way to resize the editor textarea if value is updated programatically
    setTimeout(() => textareaAutoResize(editorTextareaRef, editorLineNoDivRef), DOM_DIRECT_UPDATE_DELAY_MS);
  }

  return (
    <div className="flex flex-col h-screen bg-gray-900 text-gray-100">
      {/* Top Bar */}
      <div className="TopBar flex items-center gap-2 p-2 bg-gray-800 border-b border-gray-700">
        <select
          value={language}
          onChange={(e) => handleLanguageChange(e.target.value as Languages)}
          className="LanguageSelector flex items-center gap-2 px-3 py-1 bg-gray-700 border border-gray-600
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
          className="ExampleSelector px-3 py-1 bg-gray-700 border border-gray-600
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
      <div className="Main-Container flex-1 flex flex-row max-[700px]:flex-col overflow-hidden">
        {/* Editor Section */}
        <div className="Editor-Container min-[700px]:w-[60%] max-[700px]:h-[60%] flex flex-col border-r border-gray-700">
          {/* Tab Bar */}
          <div
            ref={tabContainerDivRef}
            onWheel={handleTabScroll}
            className="Editor-TabBar flex items-center gap-1 p-1.5 bg-gray-800 border-b border-gray-700 overflow-x-auto no-scrollbar"
          >
            {tabs.map((tab) => (
              <div
                key={tab.id}
                className={`flex items-center gap-2 px-3 py-1.5 rounded text-sm select-none ${
                  activeTab !== tab.id
                    ? "bg-gray-900 hover:bg-gray-950 text-gray-500 cursor-pointer"
                    : "bg-gray-700 text-white py-1.75"
                }`}
              >
                <span onDoubleClick={() => handleTabDoubleClick(tab)} onClick={() => setActiveTab(tab.id)}>
                  {tab.name}
                </span>
                {tabs.length > 1 && (
                  <button onClick={() => closeTab(tab.id)} className="text-gray-400 hover:text-white">
                    {"\u00d7" /* Unicode For: × */}
                  </button>
                )}
              </div>
            ))}
            <button onClick={addNewTab} className="px-2 py-1 text-lg">
              <span className="text-gray-400 hover:text-white cursor-pointer">+</span>
            </button>
          </div>

          {/* Code Editor */}
          <div className="Editor flex-1 flex flex-row overflow-auto">
            <div
              ref={editorLineNoDivRef}
              className="Editor-LineNo p-4 pr-2 flex flex-col bg-black-900 font-mono text-sm text-gray-400"
            >
              {activeTabContent.split("\n").map((_, idx) => (
                <span key={idx}>{idx + 1}</span>
              ))}
            </div>
            <textarea
              ref={editorTextareaRef}
              value={activeTabContent}
              onKeyDown={(e) => handleTabKeyDown(e, editorTextareaRef)}
              onChange={(e) => handleContentChange(e.target.value)}
              onInput={() => textareaAutoResize(editorTextareaRef, editorLineNoDivRef)}
              className="Editor-Textarea flex-1 p-4 pl-0 bg-black-900 text-gray-100 whitespace-nowrap
                font-mono text-sm resize-none focus:outline-none overflow-y-hidden"
              spellCheck={false}
              placeholder="Write your code here..."
            />
          </div>
        </div>

        {/* Console Section */}
        <div className="Console-Container min-[700px]:w-[40%] max-[700px]:h-[40%] flex flex-col bg-gray-900">
          {/* Input and Output switcher buttons */}
          <div className="Button-Container flex gap-1 p-2 bg-gray-800 border-b border-gray-700 text-sm font-medium">
            <button
              onClick={() => setConsoleMode("input")}
              className={`Button-ShowInput flex items-center gap-1 px-3 py-1.5 cursor-pointer rounded text-sm ${
                consoleMode === "input" ? "bg-blue-600 text-white" : "bg-gray-700 text-gray-300 hover:bg-gray-600"
              }`}
            >
              <FileInput size={16} />
              Input
            </button>

            <button
              onClick={() => setConsoleMode("output")}
              className={`Button-ShowOutput flex items-center gap-1 px-3 py-1.5 cursor-pointer rounded text-sm ${
                consoleMode === "output" ? "bg-blue-600 text-white" : "bg-gray-700 text-gray-300 hover:bg-gray-600"
              }`}
            >
              <Terminal size={16} />
              Output
            </button>

            <div className="Seperator-Flex1 flex-1" />

            {/* Run Button */}
            <button
              onClick={() => void handleRun()}
              disabled={isRunning}
              className="Button-Run flex items-center gap-2 px-4 py-1.5 bg-green-600 hover:bg-green-700
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

          {/* stdin */}
          {consoleMode === "input" ? (
            <textarea
              value={stdinInput}
              ref={stdinTextareaRef}
              onKeyDown={(e) => handleTabKeyDown(e, stdinTextareaRef)}
              onChange={(e) => setStdinInput(e.target.value)}
              className="Input-StdIn flex-1 p-4 bg-gray-900 text-gray-100 whitespace-nowrap
                font-mono text-sm resize-none focus:outline-none"
              placeholder="Enter input for your program..."
            />
          ) : (
            <div className="Output-Container flex-1 overflow-auto p-4 font-mono text-sm">
              {isRunning ? (
                <div className="Output-Loading flex items-center gap-2 text-gray-400">
                  <Loader2 size={16} className="animate-spin" />
                  Executing...
                </div>
              ) : output != null ? (
                <>
                  {/* exit or error codes */}
                  <div className="Output-ExitCode mb-3 pb-2 border-b border-gray-700">
                    <span className="text-xs text-gray-500">Exit Code: </span>
                    <span className={output.code === 0 ? "text-green-400" : "text-red-500"}>{output.code}</span>
                  </div>

                  {/* stdout */}
                  {output.stdout != null && output.stdout !== "" && (
                    <div className="Output-StdOut">
                      <div className="text-xs text-gray-500 mb-1">STDOUT:</div>
                      <pre className="text-white whitespace-pre-wrap mb-3 pb-2 border-b border-gray-700">
                        {output.stdout}
                      </pre>
                    </div>
                  )}

                  {/* stderr */}
                  {output.stderr != null && output.stderr !== "" && (
                    <div className="Output-StdErr">
                      <div className="text-xs text-gray-500 mb-1">STDERR:</div>
                      <pre className="text-red-300 whitespace-pre-wrap">{output.stderr}</pre>
                    </div>
                  )}
                </>
              ) : (
                <div className="Output-NoOutputInfo text-gray-500">No output yet. Click Run to execute your code.</div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Tab Name Edit Modal */}
      {editingTabId != null && (
        <div className="Dialog-Bg fixed inset-0 bg-[#101828aa] flex items-center justify-center z-50">
          <div className="Dialog-Modal bg-gray-800 p-6 rounded-lg shadow-xl w-80">
            <h3 className="H3-TabNameDialog text-lg font-medium mb-4 select-none">Rename Tab</h3>
            <input
              type="text"
              value={editingTabName}
              onChange={(e) => setEditingTabName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleTabNameChange()}
              className="Input-TabName w-full px-3 py-2 bg-gray-700 border border-gray-600
                rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              autoFocus
            />
            <div className="Buttons-Container flex gap-2 mt-4">
              <button
                onClick={() => setEditingTabId(null)}
                className="Button-Cancel flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleTabNameChange}
                className="Button-Save flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded cursor-pointer"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
