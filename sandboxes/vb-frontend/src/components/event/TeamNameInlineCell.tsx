import InlineEditableCell from '../common/InlineEditableCell';

type TeamNameInlineCellProps = {
  teamName: string;
  displayName: string;
  onSave: (value: string | null) => Promise<void>;
};

/** Stored name is editable; blank saves keep the derived display name. */
export default function TeamNameInlineCell({
  teamName,
  displayName,
  onSave,
}: TeamNameInlineCellProps) {
  return (
    <InlineEditableCell
      type="text"
      value={teamName}
      placeholder={displayName}
      displayFormatter={() => displayName}
      className="min-w-[10rem] max-w-md font-bold"
      onSave={async (v) => {
        await onSave(v as string | null);
      }}
    />
  );
}
