import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ImageWithFallback } from "./ImageWithFallback";

describe("ImageWithFallback", () => {
  it("renders the fallback without assigning a rejected source to the DOM", () => {
    render(<ImageWithFallback src="javascript:alert(document.domain)" alt="Unsafe imported image" />);

    expect(screen.queryByAltText("Unsafe imported image")).not.toBeInTheDocument();
    expect(screen.getByAltText("Fallback graphic")).not.toHaveAttribute("data-original-url");
  });

  it("preserves supported HTTP and raster data image sources", () => {
    const { rerender } = render(<ImageWithFallback src="https://images.example.com/vision.jpg" alt="Remote image" />);
    expect(screen.getByAltText("Remote image")).toHaveAttribute("src", "https://images.example.com/vision.jpg");

    rerender(<ImageWithFallback src="data:image/png;base64,QUJD" alt="Uploaded image" />);
    expect(screen.getByAltText("Uploaded image")).toHaveAttribute("src", "data:image/png;base64,QUJD");
  });

  it("does not retain the failed original source in the fallback DOM", () => {
    render(<ImageWithFallback src="https://images.example.com/broken.jpg" alt="Broken image" />);

    fireEvent.error(screen.getByAltText("Broken image"));

    expect(screen.getByAltText("Fallback graphic")).not.toHaveAttribute("data-original-url");
  });
});
