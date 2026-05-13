"use client";
import { useForm } from "react-hook-form";
import { joiResolver } from "@hookform/resolvers/joi";
import Link from "next/link";
import { registerSchema } from "@/lib/schemas";
import type { RegisterFormData } from "@/types/auth";
import { useState } from "react";
import InputField from "@/components/ui/inputs/InputField";
import Image from "next/image";
import EmailSentSuccess from "@/components/auth/EmailSentSuccess";
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
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  async function onSubmit(data: RegisterFormData) {
    setIsSubmitting(true);
    setSuccessMessage(null);
    try {
      await registerUser(data);
      setSuccessMessage(
        "If this email is not already registered, you will receive a verification link.",
      );
      reset();
    } catch (error) {
      void error;
      // Error is already handled by the auth context
    } finally {
      // Stop loading
      setIsSubmitting(false);
    }
  }

  if (successMessage) {
    return <EmailSentSuccess message={successMessage} />;
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center py-12">
      <div className="w-full max-w-md rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#111] p-6 text-center shadow-sm transition-shadow duration-300 hover:shadow-md">
        {/* Logo */}
        <Image
          src="/globe.svg"
          alt="Rendezvous Logo"
          width={120}
          height={120}
          className="mb-4 mx-auto dark:invert opacity-80"
        />

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
