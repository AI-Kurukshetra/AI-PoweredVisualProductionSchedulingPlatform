"use client";

import ConfirmDialog from "./ConfirmDialog";

type ConfirmSubmitDialogProps = {
  trigger: React.ReactNode;
  title?: string;
  description?: string;
  formId: string;
};

/**
 * Client-only wrapper that submits a form by id on confirm.
 * Use this from Server Components instead of passing onConfirm to ConfirmDialog.
 */
export default function ConfirmSubmitDialog({
  trigger,
  title,
  description,
  formId,
}: ConfirmSubmitDialogProps) {
  const onConfirm = () => {
    const form = document.getElementById(formId) as HTMLFormElement | null;
    form?.requestSubmit();
  };

  return (
    <ConfirmDialog
      trigger={trigger}
      title={title}
      description={description}
      onConfirm={onConfirm}
    />
  );
}
