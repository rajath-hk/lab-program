"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { signIn, getSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Card, CardHeader, CardContent, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { getRoleDashboard } from "@/lib/redirect";

const loginSchema = z.object({
  identifier: z.string().min(3, "Identifier is required"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

type LoginForm = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const router = useRouter();
  const [errorMessage, setErrorMessage] = useState<string>("");

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginForm>({ resolver: zodResolver(loginSchema) });

  const onSubmit = async (data: LoginForm) => {
    setErrorMessage("");
    const result = await signIn("credentials", {
      identifier: data.identifier,
      password: data.password,
      redirect: false,
    });
    if (result?.error) {
      setErrorMessage("Invalid credentials. Please try again.");
    } else {
      // Fetch session to get role
      const session = await getSession();
      const role = session?.user?.role as string;
      const destination = getRoleDashboard(role);
      router.push(destination);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100 dark:bg-gray-900">
      <Card className="w-full max-w-md">
        <CardHeader>
          <h2 className="text-center text-2xl font-bold">VPL System</h2>
          <p className="text-center text-sm text-muted-foreground">
            Virtual Programming Laboratory
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-1">
              <Label htmlFor="identifier">Roll Number or Email</Label>
              <Input
                id="identifier"
                type="text"
                placeholder="Enter email or roll number"
                {...register("identifier")}
                disabled={isSubmitting}
              />
              {errors.identifier && (
                <p className="text-sm text-red-500">{errors.identifier.message}</p>
              )}
            </div>
            <div className="space-y-1">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Enter password"
                {...register("password")}
                disabled={isSubmitting}
              />
              {errors.password && (
                <p className="text-sm text-red-500">{errors.password.message}</p>
              )}
            </div>
            {errorMessage && (
              <p className="text-center text-sm text-red-600">{errorMessage}</p>
            )}
            <Button type="submit" disabled={isSubmitting} className="w-full">
              {isSubmitting ? "Signing in..." : "Login"}
            </Button>
          </form>
        </CardContent>
        <CardFooter>
          {/* No additional links */}
        </CardFooter>
      </Card>
    </div>
  );
}
