import { createContext, useContext } from "react";

export function createStrictContext({ name, hookName }) {
  const Context = createContext(null);
  Context.displayName = name;

  const useStrictContext = () => {
    const value = useContext(Context);
    if (value === null) {
      throw new Error(`${hookName} must be used within a ${name}`);
    }
    return value;
  };

  return [Context, useStrictContext];
}

