import { forwardRef, useState } from "react";
import { Eye, EyeOff, Search } from "lucide-react";

interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "size"> {
  /** 输入框左侧图标 */
  leftIcon?: React.ReactNode;
  /** 是否为密码输入框（支持显示/隐藏切换） */
  isPassword?: boolean;
  /** 是否为搜索框 */
  isSearch?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className = "", leftIcon, isPassword, isSearch, type, ...props }, ref) => {
    const [showPassword, setShowPassword] = useState(false);

    // 确定实际的 type
    const inputType = isPassword ? (showPassword ? "text" : "password") : type;

    // 确定左侧图标
    const LeftIconComponent = isSearch ? <Search className="w-4 h-4" /> : leftIcon;

    return (
      <div className="relative">
        {/* 左侧图标 */}
        {LeftIconComponent && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-base-content/40 pointer-events-none">
            {LeftIconComponent}
          </div>
        )}

        {/* 输入框 */}
        <input
          ref={ref}
          type={inputType}
          className={`
            w-full h-8 px-3 text-sm rounded
            bg-base-100 border border-base-300
            placeholder:text-base-content/30
            hover:bg-base-100 hover:border-base-content/20
            focus:bg-base-100 focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/20
            transition-all duration-200
            ${LeftIconComponent ? "pl-9" : ""}
            ${isPassword ? "pr-10" : ""}
            ${className}
          `}
          {...props}
        />

        {/* 密码显示/隐藏按钮 */}
        {isPassword && (
          <button
            type="button"
            className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded text-base-content/40 hover:text-base-content/60 transition-colors"
            onClick={() => setShowPassword(!showPassword)}
            tabIndex={-1}
          >
            {showPassword ? (
              <EyeOff className="w-4 h-4" />
            ) : (
              <Eye className="w-4 h-4" />
            )}
          </button>
        )}
      </div>
    );
  }
);

Input.displayName = "Input";
