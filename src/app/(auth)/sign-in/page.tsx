'use client';

import { Fragment, useState, useEffect, Suspense } from "react";
import { signIn, useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import {
  Row,
  Col,
  Image,
  Card,
  CardBody,
  Form,
  FormLabel,
  FormControl,
  FormCheck,
  Button,
  Spinner,
} from "react-bootstrap";
import Link from "next/link";
import { IconEyeOff, IconEye } from "@tabler/icons-react";
import Flex from "@/components/common/Flex";
import { getAssetPath } from "@/helper/assetPath";

// Main page wrapper
export default function SignInPageWrapper() {
  return (
    <Suspense
      fallback={
        <div className="d-flex justify-content-center align-items-center vh-100">
          <Spinner animation="border" variant="warning" />
          <span className="ms-3">Loading sign-in page...</span>
        </div>
      }
    >
      <SignInPage />
    </Suspense>
  );
}

// Actual sign-in page (client component)
function SignInPage() {
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [showPassword, setShowPassword] = useState<boolean>(false);

  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams(); // Safe inside Suspense
  const callbackUrl = searchParams?.get("callbackUrl") || "/admin";

  // Already authenticated? Redirect based on role
  useEffect(() => {
    if (status === "authenticated" && session) {
      if (session.user.role === "DRIVER") {
        router.replace("/driver-portal/dashboard");
      } else if (session.user.role === "ADMIN") {
        router.replace("/admin");
      } else {
        router.replace("/");
      }
    }
  }, [status, session, router]);

  const handleSignIn = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!email || !password) {
      toast.error("Please enter email and password!");
      return;
    }

    setLoading(true);

    try {
      const result = await signIn("credentials", {
        email: email.toLowerCase().trim(),
        password,
        redirect: false,
      });

      if (result?.error) {
        toast.error("Invalid email/password or inactive user");
        setLoading(false);
        return;
      }

      const sessionRes = await fetch("/api/auth/session");
      const sessionData = await sessionRes.json();

      if (sessionData?.user?.role === "DRIVER") {
        window.location.href = "/driver-portal/dashboard";
      } else if (sessionData?.user?.role === "ADMIN") {
        window.location.href = "/admin";
      } else {
        window.location.href = "/";
      }
    } catch (err) {
      toast.error("An unexpected error occurred");
      setLoading(false);
    }
  };

  if (status === "loading") {
    return (
      <div className="d-flex justify-content-center align-items-center vh-100">
        <Spinner animation="border" variant="warning" />
        <span className="ms-3">Loading...</span>
      </div>
    );
  }

  return (
    <Fragment>
      <Row className="justify-content-center mt-5">
        <Col xl={5} lg={6} md={8}>
          <Card>
            <CardBody className="p-6">
              <div className="text-center mb-4">
                <Link
                  href="/"
                  className="fs-2 fw-bold d-flex align-items-center justify-content-center mb-2"
                >
                  <Image
                    src={getAssetPath("/images/brand/logo/logo-icon2.svg")}
                    alt="RS PRIVATE HIRE"
                  />
                </Link>
                <span
                  className="fw-bold fs-5"
                  style={{ color: "orange" }}
                >
                  RS PRIVATE HIRE
                </span>
                <h1 className="mt-2 mb-2">Welcome Back</h1>
                <p className="text-muted">Sign in to your account to continue</p>
              </div>

              <Form onSubmit={handleSignIn}>
                <FormLabel>Email</FormLabel>
                <FormControl
                  type="email"
                  value={email}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setEmail(e.target.value)
                  }
                  disabled={loading}
                  placeholder="Enter email"
                  required
                />

                <FormLabel className="mt-3">Password</FormLabel>
                <div className="position-relative">
                  <FormControl
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setPassword(e.target.value)
                    }
                    disabled={loading}
                    placeholder="Enter password"
                    required
                  />
                  <span
                    className="position-absolute end-0 top-50 translate-middle-y me-3"
                    style={{ cursor: "pointer" }}
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <IconEyeOff size={16} />
                    ) : (
                      <IconEye size={16} />
                    )}
                  </span>
                </div>

                <Flex className="mb-3 mt-3" alignItems="center" justifyContent="between">
                  <FormCheck label="Remember me" type="checkbox" disabled={loading} />
                  {/* <div className="text-muted">Forgot Password? (Coming Soon)</div> */}
                </Flex>

                <div className="d-grid mt-3">
                  <Button type="submit" disabled={loading} variant="warning">
                    {loading ? (
                      <>
                        <Spinner
                          as="span"
                          animation="border"
                          size="sm"
                          className="me-2"
                        />
                        Signing In...
                      </>
                    ) : (
                      "Sign In"
                    )}
                  </Button>
                </div>
              </Form>
            </CardBody>
          </Card>
        </Col>
      </Row>
    </Fragment>
  );
}
