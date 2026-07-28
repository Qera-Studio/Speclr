'use client';

import { FileImage, X } from 'lucide-react';
import {
  Attachment,
  AttachmentAction,
  AttachmentActions,
  AttachmentContent,
  AttachmentDescription,
  AttachmentMedia,
  AttachmentTitle,
} from '@/components/ui/attachment';
import type { IconFormat } from '@/lib/spec/types';

interface UploadedAttachmentProps {
  name: string;
  size: number;
  format: IconFormat;
  objectUrl: string;
  /** Remove the uploaded file, clearing the slot back to empty. */
  onRemove: () => void;
}

function humanSize(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  if (bytes >= 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${bytes} B`;
}

// .ico can't be rendered reliably by <img> across browsers, so it gets a file
// icon rather than a broken thumbnail. Everything else (png/jpeg/svg) previews.
function isPreviewable(format: IconFormat): boolean {
  return format !== 'ico';
}

/**
 * A shadcn Attachment showing an uploaded asset — thumbnail (or file icon) +
 * name + "TYPE · SIZE". Background-less and borderless so it can sit inside the
 * dropzone box below a divider; the surrounding box is the re-upload affordance.
 */
export default function UploadedAttachment({ name, size, format, objectUrl, onRemove }: UploadedAttachmentProps) {
  const showThumb = isPreviewable(format);

  return (
    <Attachment size="sm" className="w-full min-w-0 cursor-default border-0 bg-transparent">
      <AttachmentMedia variant={showThumb ? 'image' : 'icon'}>
        {showThumb ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={objectUrl} alt={name} />
        ) : (
          <FileImage aria-hidden="true" />
        )}
      </AttachmentMedia>
      <AttachmentContent>
        <AttachmentTitle>{name}</AttachmentTitle>
        <AttachmentDescription>
          {format.toUpperCase()} · {humanSize(size)}
        </AttachmentDescription>
      </AttachmentContent>
      <AttachmentActions className="pr-1">
        <AttachmentAction
          size="icon-sm"
          aria-label="Remove file"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="cursor-pointer rounded-md text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
        >
          <X aria-hidden="true" />
        </AttachmentAction>
      </AttachmentActions>
    </Attachment>
  );
}
