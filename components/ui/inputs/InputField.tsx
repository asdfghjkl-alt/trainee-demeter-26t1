import type {
  FieldValues,
  UseFormRegister,
  FieldError,
  Path,
} from "react-hook-form";

export default function InputField<T extends FieldValues>({
  label,
  name,
  type = "text",
  placeholder,
  register,
  error,
  className = "",
  min,
  max,
}: {
  label: string;
  name: Path<T>;
  type?: string;
  placeholder: string;
  register: UseFormRegister<T>;
  error?: FieldError;
  className?: string;
  min?: number;
  max?: number;
}) {
  return (
    <div className={className}>
      <div className="text-left">
        {/* Input field label */}
        <label
          className="mb-2 block font-medium text-gray-900 dark:text-white"
          htmlFor={name}
        >
          {label}
        </label>

        {/* Input field */}
        <input
          id={name}
          type={type}
          placeholder={placeholder}
          className="w-full rounded-xl border-2 border-solid border-gray-300 dark:border-gray-700 bg-white dark:bg-[#0a0a0a] text-gray-900 dark:text-gray-100 p-3 text-base transition-colors focus:border-cyan-500 dark:focus:border-cyan-500 outline-none"
          {...register(name, { valueAsNumber: type === "number" })}
          min={min}
          max={max}
          onWheel={(e) => e.currentTarget.blur()}
        />
      </div>

      {/* Error message */}
      <div className="text-sm text-red-500">
        {error && <span>{error.message}</span>}
      </div>
    </div>
  );
}
