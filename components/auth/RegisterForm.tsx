"use client";
import { useForm } from "react-hook-form";
import { joiResolver } from "@hookform/resolvers/joi";
import Link from "next/link";
import { registerSchema } from "@/lib/schemas";
import type { RegisterFormData } from "@/types/auth";
import { useState } from "react";
import InputField from "@/components/ui/inputs/InputField";
import { useAuth } from "@/contexts/AuthContext";

export default function RegisterForm() {
  const { register: registerUser } = useAuth();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<RegisterFormData>({
    resolver: joiResolver(registerSchema),
    mode: "onTouched",
    defaultValues: {
      fname: "",
      lname: "",
      phone: "",
      email: "",
      password: "",
      confirmPassword: "",
    },
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  async function onSubmit(data: RegisterFormData) {
    setIsSubmitting(true);
    try {
      await registerUser(data);
      reset();
    } catch (error) {
      void error;
      // Error is already handled by the auth context
    } finally {
      // Stop loading
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
            <path fillRule="evenodd" clipRule="evenodd" d="M10.27 14.1a6.5 6.5 0 0 0 3.67-3.45q-1.24.21-2.7.34-.31 1.83-.97 3.1M8 16A8 8 0 1 0 8 0a8 8 0 0 0 0 16m.48-1.52a7 7 0 0 1-.96 0H7.5a4 4 0 0 1-.84-1.32q-.38-.89-.63-2.08a40 40 0 0 0 3.92 0q-.25 1.2-.63 2.08a4 4 0 0 1-.84 1.31zm2.94-4.76q1.66-.15 2.95-.43a7 7 0 0 0 0-2.58q-1.3-.27-2.95-.43a18 18 0 0 1 0 3.44m-1.27-3.54a17 17 0 0 1 0 3.64 39 39 0 0 1-4.3 0 17 17 0 0 1 0-3.64 39 39 0 0 1 4.3 0m1.1-1.17q1.45.13 2.69.34a6.5 6.5 0 0 0-3.67-3.44q.65 1.26.98 3.1M8.48 1.5l.01.02q.41.37.84 1.31.38.89.63 2.08a40 40 0 0 0-3.92 0q.25-1.2.63-2.08a4 4 0 0 1 .85-1.32 7 7 0 0 1 .96 0m-2.75.4a6.5 6.5 0 0 0-3.67 3.44 29 29 0 0 1 2.7-.34q.31-1.83.97-3.1M4.58 6.28q-1.66.16-2.95.43a7 7 0 0 0 0 2.58q1.3.27 2.95.43a18 18 0 0 1 0-3.44m.17 4.71q-1.45-.12-2.69-.34a6.5 6.5 0 0 0 3.67 3.44q-.65-1.27-.98-3.1" fill="currentColor"/>
          </g>
          <defs>
            <clipPath id="a">
              <path fill="#fff" d="M0 0h16v16H0z"/>
            </clipPath>
          </defs>
        </svg>

        {/* Create an Account heading */}
        <h3 className="mb-4 text-gray-900 dark:text-gray-100">
          Create an Account
        </h3>

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          {/* First Name and Last Name */}
          <div className="flex gap-2">
            <InputField
              name="fname"
              placeholder="First Name"
              label="First Name"
              register={register}
              error={errors.fname}
            />
            <InputField
              name="lname"
              placeholder="Last Name"
              label="Last Name"
              register={register}
              error={errors.lname}
            />
          </div>

          {/* Email */}
          <InputField
            name="email"
            placeholder="Email"
            label="Email"
            register={register}
            error={errors.email}
          />

          {/* Phone Number */}
          <InputField
            name="phone"
            placeholder="Mobile Number"
            label="Mobile Number"
            register={register}
            error={errors.phone}
          />

          {/* Password and confirm password fields */}
          <InputField
            name="password"
            placeholder="Password"
            type="password"
            label="Password"
            register={register}
            error={errors.password}
          />
          <InputField
            name="confirmPassword"
            placeholder="Confirm Password"
            type="password"
            label="Confirm Password"
            register={register}
            error={errors.confirmPassword}
          />

          {/* Submit button */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="btn btn-submit w-full mt-4"
          >
            {isSubmitting ? "Creating Account..." : "Register"}
          </button>

          {/* Login link */}
          <p className="mt-4 text-gray-700 dark:text-gray-300">
            Already have an account?{" "}
            <Link
              href="/auth/login"
              className="text-cyan-600 dark:text-cyan-400 decoration-cyan-500 decoration-solid hover:text-cyan-500 dark:hover:text-cyan-300 hover:underline"
            >
              Login here
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
