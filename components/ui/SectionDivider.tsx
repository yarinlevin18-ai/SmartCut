export function SectionDivider() {
  return (
    <div className="flex items-center justify-center gap-4 px-10 py-2 bg-[#0b0b0d]">
      <span
        className="flex-1 block"
        style={{ height: 1, background: "linear-gradient(to right, transparent, rgba(201,168,76,0.3), transparent)" }}
      />
      <span
        className="block flex-shrink-0"
        style={{
          width: 8,
          height: 8,
          border: "1px solid #c9a84c",
          transform: "rotate(45deg)",
        }}
      />
      <span
        className="flex-1 block"
        style={{ height: 1, background: "linear-gradient(to left, transparent, rgba(201,168,76,0.3), transparent)" }}
      />
    </div>
  );
}
