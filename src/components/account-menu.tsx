"use client";

import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { LogOut, Trash2, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { logoutCustomer, deleteCustomerAccount } from "@/actions/customer-account";

export default function AccountMenu() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, right: 0 });

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        menuRef.current &&
        !menuRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    }

    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  useEffect(() => {
    if (!open || !buttonRef.current) return;

    const updatePosition = () => {
      const rect = buttonRef.current?.getBoundingClientRect();
      if (!rect) return;

      setDropdownPosition({
        top: rect.bottom + 8,
        right: window.innerWidth - rect.right,
      });
    };

    updatePosition();
    window.addEventListener("resize", updatePosition);
    return () => window.removeEventListener("resize", updatePosition);
  }, [open]);

  async function handleLogout() {
    setIsLoading(true);
    try {
      await logoutCustomer();
      router.push("/auth");
      router.refresh();
    } finally {
      setIsLoading(false);
    }
  }

  async function handleDeleteAccount() {
    setIsLoading(true);
    try {
      const result = await deleteCustomerAccount();
      if (result.success) {
        router.push("/auth");
        router.refresh();
      }
    } finally {
      setIsLoading(false);
      setShowDeleteDialog(false);
    }
  }

  return (
    <>
      <Button
        ref={buttonRef}
        variant="ghost"
        size="icon"
        onClick={() => setOpen((prev) => !prev)}
        aria-label="Account menu"
        className="rounded-full"
      >
        <User className="size-5 text-destructive" />
      </Button>

      {mounted && open && createPortal(
        <div
          ref={menuRef}
          className="fixed z-50 w-48 rounded-lg border border-border bg-popover p-1 shadow-lg"
          style={{
            top: `${dropdownPosition.top}px`,
            right: `${dropdownPosition.right}px`,
          }}
        >
          <button
            onClick={handleLogout}
            disabled={isLoading}
            className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-popover-foreground transition-colors hover:bg-muted disabled:opacity-50"
          >
            <LogOut className="size-4" />
            Logout
          </button>
          <button
            onClick={() => {
              setOpen(false);
              setShowDeleteDialog(true);
            }}
            disabled={isLoading}
            className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-destructive transition-colors hover:bg-destructive/10 disabled:opacity-50"
          >
            <Trash2 className="size-4" />
            Delete Account
          </button>
        </div>,
        document.body,
      )}

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent >
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Account</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to permanently delete your account? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isLoading}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteAccount}
              disabled={isLoading}
              className="bg-red-600/85 text-destructive-foreground hover:bg-red-700/85"
            >
              {isLoading ? "Deleting..." : "Delete Account"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
