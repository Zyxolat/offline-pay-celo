import type { InputHTMLAttributes } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  hint?: string;
}

export const Input = ({ className = "", hint, id, label, ...props }: InputProps) => {
  return (
    <label className="offlinepay-input-group" htmlFor={id}>
      <span className="offlinepay-input-group__label">{label}</span>
      <input id={id} className={["offlinepay-input", className].filter(Boolean).join(" ")} {...props} />
      {hint ? <span className="offlinepay-input-group__hint">{hint}</span> : null}
    </label>
  );
};

export default Input;
