import { describe, expect, it } from "vitest";
import { buildFragmentUrl, buildTextDirective, encodeFragmentPart } from "../../src/lib/textFragment";

describe("text fragments", () => {
  it("matches short passages whole", () => {
    expect(buildTextDirective("saved about 55 minutes a day")).toBe("text=saved%20about%2055%20minutes%20a%20day");
  });

  it("uses start and end words for long passages", () => {
    const long =
      "People who worked from home saved about 55 minutes a day on average, and most of that time went back into work and leisure rather than sleep.";
    expect(buildTextDirective(long)).toBe(
      "text=People%20who%20worked%20from%20home,and%20leisure%20rather%20than%20sleep.",
    );
  });

  it("escapes the characters text directives use as syntax", () => {
    expect(encodeFragmentPart("cost-benefit, R&D")).toBe("cost%2Dbenefit%2C%20R%26D");
  });

  it("adds a little context on each side", () => {
    // context comes with its spaces, like contextAround returns it
    expect(buildTextDirective("the key finding", "This is ", " of the study")).toBe(
      "text=This%20is-,the%20key%20finding,-of%20the%20study",
    );
  });

  it("drops partial words at the edges", () => {
    // selection started in the middle of "example" and ended in the middle of "study"
    expect(buildTextDirective("mple of the method used in the stu", "an exa", "dy we")).toBe(
      "text=of%20the%20method%20used%20in%20the",
    );
  });

  it("keeps a normal #section and replaces an old directive", () => {
    expect(buildFragmentUrl("https://ex.com/a#intro", "hello world")).toBe("https://ex.com/a#intro:~:text=hello%20world");
    expect(buildFragmentUrl("https://ex.com/a#:~:text=old", "new")).toBe("https://ex.com/a#:~:text=new");
    expect(buildFragmentUrl("https://ex.com/a?q=1", "hi")).toBe("https://ex.com/a?q=1#:~:text=hi");
  });
});
