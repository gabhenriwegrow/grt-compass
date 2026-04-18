import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/utils";

export const Markdown = ({ content, className }: { content: string; className?: string }) => (
  <div
    className={cn(
      "prose prose-sm max-w-none",
      "prose-headings:font-bold prose-headings:tracking-tight prose-headings:text-foreground",
      "prose-h2:text-base prose-h2:mt-5 prose-h2:mb-2 prose-h2:text-[#9B26B6] prose-h2:uppercase prose-h2:tracking-wider prose-h2:font-bold",
      "prose-h3:text-sm prose-h3:mt-4 prose-h3:mb-1.5 prose-h3:text-foreground",
      "prose-p:text-sm prose-p:text-foreground/90 prose-p:leading-relaxed",
      "prose-strong:text-foreground prose-strong:font-semibold",
      "prose-li:text-sm prose-li:text-foreground/90 prose-li:my-0.5",
      "prose-ul:my-2 prose-ol:my-2",
      "prose-code:text-[#9B26B6] prose-code:bg-muted prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:text-xs prose-code:before:content-none prose-code:after:content-none",
      "prose-hr:border-border",
      className
    )}
  >
    <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
  </div>
);
