import { describe, expect, it } from "vitest";

import { fmtDate, fmtSize, statusBadgeCls, statusText } from "@/lib/format";

describe("fmtSize", () => {
  it("空值返回占位符", () => {
    expect(fmtSize(null)).toBe("-");
    expect(fmtSize(undefined)).toBe("-");
  });

  it("按 B/KB/MB 分档", () => {
    expect(fmtSize(512)).toBe("512 B");
    expect(fmtSize(2048)).toBe("2.0 KB");
    expect(fmtSize(5 * 1024 * 1024)).toBe("5.0 MB");
  });
});

describe("fmtDate", () => {
  it("空值返回占位符", () => {
    expect(fmtDate(null)).toBe("-");
    expect(fmtDate("")).toBe("-");
  });

  it("非法日期原样返回", () => {
    expect(fmtDate("not-a-date")).toBe("not-a-date");
  });

  it("合法日期返回中文格式", () => {
    const out = fmtDate("2026-09-28T10:00:00Z");
    expect(out).toContain("2026");
  });
});

describe("statusText/statusBadgeCls", () => {
  it("三种已知状态各有文案与配色", () => {
    for (const s of ["INDEXED", "PENDING", "FAILED"]) {
      expect(statusText(s)).not.toBe(s);
      expect(statusBadgeCls(s)).not.toBe("bg-muted text-foreground/60");
    }
    expect(statusText("INDEXED")).toBe("已索引");
  });

  it("未知状态原样透出并走默认配色", () => {
    expect(statusText("WEIRD")).toBe("WEIRD");
    expect(statusBadgeCls("WEIRD")).toBe("bg-muted text-foreground/60");
  });
});
