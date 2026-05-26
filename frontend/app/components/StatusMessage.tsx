type Status = { type: "success" | "error"; message: string } | null;

export default function StatusMessage({ status }: { status: Status }) {
  if (!status) return null;
  return (
    <p className={status.type === "success" ? "text-green-600 text-sm" : "text-red-500 text-sm"}>
      {status.message}
    </p>
  );
}
