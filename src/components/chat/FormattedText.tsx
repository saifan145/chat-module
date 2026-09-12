import React from "react";

interface FormattedTextProps {
  content: string;
  className?: string;
}

export const FormattedText: React.FC<FormattedTextProps> = ({
  content,
  className = "",
}) => {
  // Check if content contains code blocks ```code```
  if (content.includes("```")) {
    const parts = content.split(/(```[\s\S]*?```)/g);
    return (
      <div className={`space-y-2 ${className}`}>
        {parts.map((part, index) => {
          if (part.startsWith("```") && part.endsWith("```")) {
            const raw = part.slice(3, -3).trim();
            const lines = raw.split("\n");
            let language = "";
            let codeContent = raw;
            if (lines.length > 1 && /^[a-zA-Z0-9_-]+$/.test(lines[0].trim())) {
              language = lines[0].trim();
              codeContent = lines.slice(1).join("\n");
            }
            return (
              <div
                key={index}
                className="rounded-xl overflow-hidden bg-[#1e1e24] text-slate-100 my-2 text-xs font-mono border border-slate-700 shadow-sm"
              >
                {language && (
                  <div className="bg-[#141417] px-3 py-1 text-[10px] text-gray-400 font-semibold border-b border-slate-700 uppercase tracking-wider flex items-center justify-between">
                    <span>{language}</span>
                    <button
                      type="button"
                      onClick={() => navigator.clipboard.writeText(codeContent)}
                      className="hover:text-white"
                    >
                      Copy
                    </button>
                  </div>
                )}
                <pre className="p-3 overflow-x-auto whitespace-pre leading-relaxed">
                  <code>{codeContent}</code>
                </pre>
              </div>
            );
          }
          return <span key={index}>{renderInlineStyles(part)}</span>;
        })}
      </div>
    );
  }

  return (
    <div className={`whitespace-pre-wrap break-words leading-relaxed ${className}`}>
      {renderInlineStyles(content)}
    </div>
  );
};

function renderInlineStyles(text: string): React.ReactNode {
  // Inline code: `code`
  const codeSplits = text.split(/(`[^`]+`)/g);
  return codeSplits.map((seg, i) => {
    if (seg.startsWith("`") && seg.endsWith("`")) {
      return (
        <code
          key={i}
          className="px-1.5 py-0.5 rounded bg-gray-100 text-rose-600 font-mono text-[12px] border border-gray-200"
        >
          {seg.slice(1, -1)}
        </code>
      );
    }

    // Bold (**text**) and Italic (*text*)
    return renderBoldItalic(seg, i);
  });
}

function renderBoldItalic(text: string, keyPrefix: number | string): React.ReactNode {
  const boldSplits = text.split(/(\*\*[^*]+\*\*)/g);
  return boldSplits.map((part, idx) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={`${keyPrefix}-b-${idx}`} className="font-bold text-slate-900">
          {part.slice(2, -2)}
        </strong>
      );
    }
    // Blockquote
    if (part.startsWith("> ")) {
      return (
        <blockquote
          key={`${keyPrefix}-q-${idx}`}
          className="border-l-2 border-indigo-400 pl-2.5 my-1 text-slate-600 italic bg-gray-50/50 py-0.5 rounded-r"
        >
          {part.slice(2)}
        </blockquote>
      );
    }
    return part;
  });
}
