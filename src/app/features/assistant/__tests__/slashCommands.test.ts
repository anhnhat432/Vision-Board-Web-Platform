import { describe, expect, it } from "vitest";
import { filterCommands, getHelpMessage, SLASH_COMMANDS } from "../slashCommands";

describe("filterCommands", () => {
  it("returns empty array when input doesn't start with /", () => {
    expect(filterCommands("hello")).toHaveLength(0);
    expect(filterCommands("")).toHaveLength(0);
  });

  it("returns all commands when only / is entered", () => {
    const result = filterCommands("/");
    expect(result).toHaveLength(SLASH_COMMANDS.length);
  });

  it("filters commands by prefix", () => {
    const result = filterCommands("/to");
    expect(result).toHaveLength(1);
    expect(result.map((c) => c.command)).toEqual(["/today"]);
  });

  it("filters /clear correctly", () => {
    const result = filterCommands("/cle");
    expect(result).toHaveLength(1);
    expect(result[0].command).toBe("/clear");
  });

  it("filters /help correctly", () => {
    const result = filterCommands("/hel");
    expect(result).toHaveLength(1);
    expect(result[0].command).toBe("/help");
  });

  it("returns empty array when no match", () => {
    const result = filterCommands("/xyz");
    expect(result).toHaveLength(0);
  });

  it("is case-insensitive", () => {
    const result = filterCommands("/TODAY");
    expect(result).toHaveLength(1);
    expect(result[0].command).toBe("/today");
  });
});

describe("getHelpMessage", () => {
  it("includes all commands in the help message", () => {
    const help = getHelpMessage();
    expect(help).toContain("**/today**");
    expect(help).toContain("**/week**");
    expect(help).toContain("**/goals**");
    expect(help).toContain("**/reflection**");
    expect(help).toContain("**/clear**");
    expect(help).toContain("**/help**");
  });

  it("includes command descriptions", () => {
    const help = getHelpMessage();
    expect(help).toContain("Xem việc cần làm hôm nay");
    expect(help).toContain("Tóm tắt tuần này");
    expect(help).toContain("Liệt kê mục tiêu");
  });
});