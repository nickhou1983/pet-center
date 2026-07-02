// This file is AI-generated for testing the PublishForm component (M5).
// Tests cover form state management, validation, submission, and error handling
// for the pet publishing form.

import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import PublishForm from "../publish/PublishForm";

// Mock the next/navigation module
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
  }),
}));

describe("PublishForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("rendering", () => {
    it("renders the form with all required fields", () => {
      render(<PublishForm />);

      // Check for category buttons
      expect(screen.getByRole("button", { name: /备案/ })).toBeTruthy();
      expect(screen.getByRole("button", { name: /走失/ })).toBeTruthy();
      expect(screen.getByRole("button", { name: /捡到/ })).toBeTruthy();
      expect(screen.getByRole("button", { name: /领养/ })).toBeTruthy();

      // Check for required field indicators
      expect(screen.getByText(/物种.*\*/)).toBeTruthy();
      expect(screen.getByText(/照片.*\*/)).toBeTruthy();

      // Check for form submit button
      expect(screen.getByRole("button", { name: /发布/ })).toBeTruthy();
    });

    it("renders category selection with REGISTERED as default", () => {
      render(<PublishForm />);
      const registeredBtn = screen.getByRole("button", { name: /备案/ });
      expect(registeredBtn).toHaveAttribute("aria-pressed", "true");
    });

    it("renders all pet attribute fields", () => {
      render(<PublishForm />);

      // Check for select/input fields
      expect(screen.getByLabelText(/物种/)).toBeTruthy();
      expect(screen.getByLabelText(/品种/)).toBeTruthy();
      expect(screen.getByLabelText(/毛色/)).toBeTruthy();
      expect(screen.getByLabelText(/体型/)).toBeTruthy();
      expect(screen.getByLabelText(/性别/)).toBeTruthy();
      expect(screen.getByLabelText(/年龄/)).toBeTruthy();
      expect(screen.getByLabelText(/地区/)).toBeTruthy();
      expect(screen.getByLabelText(/名称/)).toBeTruthy();
    });

    it("renders contact information fields", () => {
      render(<PublishForm />);

      expect(screen.getByLabelText(/联系人/)).toBeTruthy();
      expect(screen.getByLabelText(/联系电话/)).toBeTruthy();
    });

    it("renders description textarea", () => {
      render(<PublishForm />);

      const description = screen.getByLabelText(/描述/);
      expect(description).toBeTruthy();
      expect(description.tagName).toBe("TEXTAREA");
    });
  });

  describe("category selection", () => {
    it("switches category when category button is clicked", async () => {
      render(<PublishForm />);

      const lostBtn = screen.getByRole("button", { name: /走失/ });
      expect(lostBtn).toHaveAttribute("aria-pressed", "false");

      fireEvent.click(lostBtn);

      expect(lostBtn).toHaveAttribute("aria-pressed", "true");
      expect(screen.getByRole("button", { name: /备案/ })).toHaveAttribute(
        "aria-pressed",
        "false",
      );
    });

    it("only one category is active at a time", () => {
      render(<PublishForm />);

      const foundBtn = screen.getByRole("button", { name: /捡到/ });
      fireEvent.click(foundBtn);

      const adoptionBtn = screen.getByRole("button", { name: /领养/ });
      fireEvent.click(adoptionBtn);

      expect(foundBtn).toHaveAttribute("aria-pressed", "false");
      expect(adoptionBtn).toHaveAttribute("aria-pressed", "true");
    });
  });

  describe("field input and state management", () => {
    it("updates species field when changed", async () => {
      render(<PublishForm />);

      const speciesSelect = screen.getByLabelText(/物种/) as HTMLSelectElement;
      await userEvent.selectOptions(speciesSelect, "DOG");

      expect(speciesSelect.value).toBe("DOG");
    });

    it("updates optional text fields when changed", async () => {
      render(<PublishForm />);

      const breedInput = screen.getByLabelText(/品种/) as HTMLInputElement;
      const colorInput = screen.getByLabelText(/毛色/) as HTMLInputElement;
      const nameInput = screen.getByLabelText(/名称/) as HTMLInputElement;

      await userEvent.type(breedInput, "金毛");
      await userEvent.type(colorInput, "黄色");
      await userEvent.type(nameInput, "小黄");

      expect(breedInput.value).toBe("金毛");
      expect(colorInput.value).toBe("黄色");
      expect(nameInput.value).toBe("小黄");
    });

    it("updates gender dropdown correctly", async () => {
      render(<PublishForm />);

      const genderSelect = screen.getByLabelText(/性别/) as HTMLSelectElement;
      await userEvent.selectOptions(genderSelect, "MALE");

      expect(genderSelect.value).toBe("MALE");
    });

    it("updates age field with numeric input", async () => {
      render(<PublishForm />);

      const ageInput = screen.getByLabelText(/年龄/) as HTMLInputElement;
      await userEvent.type(ageInput, "5");

      expect(ageInput.value).toBe("5");
    });

    it("updates contact fields correctly", async () => {
      render(<PublishForm />);

      const contactNameInput = screen.getByLabelText(/联系人/) as HTMLInputElement;
      const contactPhoneInput = screen.getByLabelText(/联系电话/) as HTMLInputElement;

      await userEvent.type(contactNameInput, "张三");
      await userEvent.type(contactPhoneInput, "13800000000");

      expect(contactNameInput.value).toBe("张三");
      expect(contactPhoneInput.value).toBe("13800000000");
    });
  });

  describe("form validation and submission", () => {
    it("displays validation error when submitting with missing required fields", async () => {
      render(<PublishForm />);

      const submitBtn = screen.getByRole("button", { name: /发布/ });
      fireEvent.click(submitBtn);

      // Wait for error message to appear
      await waitFor(() => {
        const alert = screen.queryByRole("alert");
        expect(alert?.textContent).toMatch(/请检查表单/);
      });
    });

    it("shows error banner when validation fails", async () => {
      render(<PublishForm />);

      // Try to submit without filling required fields (species and photos)
      const submitBtn = screen.getByRole("button", { name: /发布/ });
      fireEvent.click(submitBtn);

      await waitFor(() => {
        const alert = screen.getByRole("alert");
        expect(alert).toBeTruthy();
        expect(alert.textContent).toContain("请检查表单");
      });
    });
  });

  describe("default field values", () => {
    it("initializes with correct default values", () => {
      render(<PublishForm />);

      // Check that select fields have expected default values
      const genderSelect = screen.getByLabelText(/性别/) as HTMLSelectElement;
      expect(genderSelect.value).toBe("UNKNOWN");

      // Other text fields should be empty
      const breedInput = screen.getByLabelText(/品种/) as HTMLInputElement;
      expect(breedInput.value).toBe("");
    });

    it("initializes category as REGISTERED", () => {
      render(<PublishForm />);

      const registeredBtn = screen.getByRole("button", { name: /备案/ });
      expect(registeredBtn).toHaveAttribute("aria-pressed", "true");
    });
  });

  describe("ImageUploader integration", () => {
    it("renders the ImageUploader component for photo uploads", () => {
      render(<PublishForm />);

      // The ImageUploader should be rendered
      // We verify by checking for the label and description related to photos
      expect(screen.getByText(/第一张为主图/)).toBeTruthy();
    });
  });

  describe("accessibility", () => {
    it("uses semantic HTML elements", () => {
      render(<PublishForm />);

      // Check for semantic form structure
      const form = screen.getByRole("button", { name: /发布/ }).closest("form");
      expect(form?.tagName).toBe("FORM");
    });

    it("provides aria-pressed for category buttons", () => {
      render(<PublishForm />);

      const categoryBtns = screen.getAllByRole("button").slice(0, 4);
      categoryBtns.forEach((btn) => {
        expect(btn).toHaveAttribute("aria-pressed");
      });
    });

    it("provides proper labels for all form inputs", () => {
      render(<PublishForm />);

      // Verify all inputs have associated labels
      expect(screen.getByLabelText(/物种/)).toBeTruthy();
      expect(screen.getByLabelText(/品种/)).toBeTruthy();
      expect(screen.getByLabelText(/毛色/)).toBeTruthy();
      expect(screen.getByLabelText(/体型/)).toBeTruthy();
      expect(screen.getByLabelText(/性别/)).toBeTruthy();
      expect(screen.getByLabelText(/年龄/)).toBeTruthy();
      expect(screen.getByLabelText(/地区/)).toBeTruthy();
      expect(screen.getByLabelText(/名称/)).toBeTruthy();
      expect(screen.getByLabelText(/描述/)).toBeTruthy();
      expect(screen.getByLabelText(/联系人/)).toBeTruthy();
      expect(screen.getByLabelText(/联系电话/)).toBeTruthy();
    });
  });
});
