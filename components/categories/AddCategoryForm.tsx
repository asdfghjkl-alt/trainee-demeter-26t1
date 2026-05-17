"use client";
import { useForm } from "react-hook-form";
import { joiResolver } from "@hookform/resolvers/joi";
import Link from "next/link";
import { useState } from "react";
import InputField from "@/components/ui/inputs/InputField";
import { categorySchema } from "@/lib/schemas";
import api from "@/lib/axios";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

interface CategoryFormData {
  name: string;
}

export default function AddCategoryForm() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CategoryFormData>({
    resolver: joiResolver(categorySchema),
    mode: "onTouched",
    defaultValues: { name: "" },
  });

  async function onSubmit(data: CategoryFormData) {
    setIsSubmitting(true);
    setServerError(null);
    try {
      const res = await api.post("/categories", data);
      toast.success(res.data.message || "Category successfully created");
      router.push("/categories");
    } catch (error: any) {
      console.error(error);
      setServerError(error.response?.data?.message || "An error occurred");
      setIsSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center py-12">
      <div className="w-full max-w-md rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#111] p-6 text-center shadow-sm transition-shadow duration-300 hover:shadow-md">
        {/* Logo */}
        <svg
          className="mb-4 mx-auto w-[120px] h-[120px] text-cyan-600 dark:text-cyan-600 opacity-80"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 16 16"
          aria-label="Rendezvous Logo"
        >
          <g clipPath="url(#a)">
            <path
              fillRule="evenodd"
              clipRule="evenodd"
              d="M10.27 14.1a6.5 6.5 0 0 0 3.67-3.45q-1.24.21-2.7.34-.31 1.83-.97 3.1M8 16A8 8 0 1 0 8 0a8 8 0 0 0 0 16m.48-1.52a7 7 0 0 1-.96 0H7.5a4 4 0 0 1-.84-1.32q-.38-.89-.63-2.08a40 40 0 0 0 3.92 0q-.25 1.2-.63 2.08a4 4 0 0 1-.84 1.31zm2.94-4.76q1.66-.15 2.95-.43a7 7 0 0 0 0-2.58q-1.3-.27-2.95-.43a18 18 0 0 1 0 3.44m-1.27-3.54a17 17 0 0 1 0 3.64 39 39 0 0 1-4.3 0 17 17 0 0 1 0-3.64 39 39 0 0 1 4.3 0m1.1-1.17q1.45.13 2.69.34a6.5 6.5 0 0 0-3.67-3.44q.65 1.26.98 3.1M8.48 1.5l.01.02q.41.37.84 1.31.38.89.63 2.08a40 40 0 0 0-3.92 0q.25-1.2.63-2.08a4 4 0 0 1 .85-1.32 7 7 0 0 1 .96 0m-2.75.4a6.5 6.5 0 0 0-3.67 3.44 29 29 0 0 1 2.7-.34q.31-1.83.97-3.1M4.58 6.28q-1.66.16-2.95.43a7 7 0 0 0 0 2.58q1.3.27 2.95.43a18 18 0 0 1 0-3.44m.17 4.71q-1.45-.12-2.69-.34a6.5 6.5 0 0 0 3.67 3.44q-.65-1.27-.98-3.1"
              fill="currentColor"
            />
          </g>
          <defs>
            <clipPath id="a">
              <path fill="#fff" d="M0 0h16v16H0z" />
            </clipPath>
          </defs>
        </svg>
        {/* Heading */}
        <h3 className="mb-4 text-gray-900 dark:text-gray-100">
          Add New Category
        </h3>

        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          {/* Category Name field */}
          <InputField
            name="name"
            placeholder="Category Name"
            label="Name"
            register={register}
            error={errors.name}
          />

          {serverError && (
            <p className="text-red-500 dark:text-red-400 text-sm mt-2">
              {serverError}
            </p>
          )}

          {/* Submit button */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="btn btn-submit w-full my-4"
          >
            {isSubmitting ? "Adding Category..." : "Add Category"}
          </button>

          {/* Link back to categories */}
          <p className="mt-4">
            <Link
              href="/categories"
              className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:underline"
            >
              Back to Category Management
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
