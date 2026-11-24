import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeSanitize from "rehype-sanitize";

import { cn } from "@/lib/utils";

/**
 * Renders user Markdown (notes, description) sanitized: raw HTML/scripts never
 * execute (VAL-ITEM-10). Basic element styling is applied inline since we don't
 * pull in the Tailwind typography plugin.
 */
export function Markdown({
  children,
  className,
}: {
  children: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "text-sm leading-relaxed [&_a]:underline [&_a]:underline-offset-2 [&_h1]:mt-3 [&_h1]:text-lg [&_h1]:font-semibold [&_h2]:mt-3 [&_h2]:text-base [&_h2]:font-semibold [&_ol]:my-2 [&_ol]:list-decimal [&_ol]:pl-5 [&_p]:my-2 [&_ul]:my-2 [&_ul]:list-disc [&_ul]:pl-5",
        className,
      )}
    >
      <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeSanitize]}>
        {children}
      </ReactMarkdown>
    </div>
  );
}
