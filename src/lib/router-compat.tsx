/**
 * Compatibility shim for code originally written against react-router-dom.
 * Re-exports TanStack Router primitives with relaxed types so existing
 * <Link to={`/x/${id}`}> / useNavigate("/x") / useParams<{x:string}>() call
 * sites keep working during the port.
 */
import * as React from "react";
import {
  Link as TSRLink,
  Navigate as TSRNavigate,
  Outlet,
  useNavigate as useTSRNavigate,
  useParams as useTSRParams,
  useRouter,
  useRouterState,
  useSearch as useTSRSearch,
} from "@tanstack/react-router";

export { Outlet };

type AnyProps = Record<string, any>;

export const Link = React.forwardRef<HTMLAnchorElement, AnyProps>(function Link(
  { to, replace, state: _state, end: _end, ...rest },
  ref,
) {
  // TanStack accepts runtime string paths even though typings prefer typed routes.
  const LinkAny = TSRLink as unknown as React.ComponentType<AnyProps>;
  return <LinkAny ref={ref} to={to} replace={replace} {...rest} />;
});

export function Navigate(props: AnyProps) {
  const NavAny = TSRNavigate as unknown as React.ComponentType<AnyProps>;
  return <NavAny {...props} />;
}

/**
 * Drop-in replacement for react-router-dom's useNavigate. Supports:
 *   navigate("/path")
 *   navigate("/path", { replace: true })
 *   navigate(-1) / navigate(1)
 */
export function useNavigate() {
  const tsrNavigate = useTSRNavigate();
  const router = useRouter();
  return React.useCallback(
    (to: string | number, options?: { replace?: boolean; state?: unknown }) => {
      if (typeof to === "number") {
        if (to < 0) for (let i = 0; i < -to; i++) router.history.back();
        else for (let i = 0; i < to; i++) router.history.forward();
        return;
      }
      return (tsrNavigate as any)({ to, replace: options?.replace });
    },
    [tsrNavigate, router],
  );
}

export function useParams<T extends Record<string, string | undefined> = Record<string, string | undefined>>(): T {
  return useTSRParams({ strict: false }) as T;
}

export function useLocation() {
  return useRouterState({ select: (s) => s.location });
}

export function useSearchParams(): [URLSearchParams, (next: URLSearchParams | Record<string, string>) => void] {
  const location = useLocation();
  const navigate = useTSRNavigate();
  const params = React.useMemo(() => {
    const search = (location as any).searchStr ?? "";
    return new URLSearchParams(search.startsWith("?") ? search.slice(1) : search);
  }, [location]);
  const setParams = React.useCallback(
    (next: URLSearchParams | Record<string, string>) => {
      const obj =
        next instanceof URLSearchParams ? Object.fromEntries(next.entries()) : next;
      (navigate as any)({ to: ".", search: obj, replace: true });
    },
    [navigate],
  );
  return [params, setParams];
}

// react-router-dom also exports these; keep as best-effort passthroughs.
export const useSearch = useTSRSearch;