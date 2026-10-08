"use client";

import { Fragment, useState } from "react";
import Feedback from "react-bootstrap/Feedback";
import {
  Row,
  Col,
  Image,
  Card,
  CardBody,
  Form,
  FormLabel,
  FormControl,
  Button,
} from "react-bootstrap";
import Link from "next/link";
import { IconEyeOff, IconEye } from "@tabler/icons-react";

import Flex from "../../../components/common/Flex";
import { getAssetPath } from "../../../helper/assetPath";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

const SignUp = () => {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({ name: "", email: "", password: "" });
  const [errors, setErrors] = useState({ name: "", email: "", password: "" });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    // Basic validation
    const newErrors = { name: "", email: "", password: "" };
    if (!formData.name) newErrors.name = "Please enter name";
    if (!formData.email) newErrors.email = "Please enter email";
    if (!formData.password) newErrors.password = "Please enter password";
    setErrors(newErrors);

    if (Object.values(newErrors).some((err) => err)) return;

    // Call API
    const res = await fetch("/api/admin/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(formData),
    });

    const data = await res.json();
    toast.info(data.message);
     if (res.ok) {
       router.push("/sign-in")
     }
  };

  return (
    <Fragment>
      <Row className="mb-8">
        <Col xl={{ span: 4, offset: 4 }} md={12}>
          <div className="text-center">
            <Link href="/" className="fs-2 fw-bold d-flex align-items-center  justify-content-center mb-6 mt-9">
            
              <Image src={getAssetPath("/images/brand/logo/logo-icon2.svg")} alt="Rs Private" />
            
            </Link>
            <span className="fw-bold fs-5 site-logo-text text-center" style={{color:"orange"}}>RS PRIVATE HIRE</span>

            <h1 className="mb-1">Sign UP For New Admin Account</h1>
          </div>
        </Col>
      </Row>

      <Row className="justify-content-center">
        <Col xl={5} lg={6} md={8}>
          <Card className="card-lg mb-6">
            <CardBody className="p-6">
              <Form className="mb-6" onSubmit={handleSubmit}>
                <div className="mb-3">
                  <FormLabel htmlFor="signupNameInput">
                    Name <span className="text-danger">*</span>
                  </FormLabel>
                  <FormControl
                    type="text"
                    id="signupNameInput"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    isInvalid={!!errors.name}
                  />
                  <Feedback type="invalid">{errors.name}</Feedback>
                </div>

                <div className="mb-3">
                  <FormLabel htmlFor="signupEmailInput">
                    Email <span className="text-danger">*</span>
                  </FormLabel>
                  <FormControl
                    type="email"
                    id="signupEmailInput"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    isInvalid={!!errors.email}
                  />
                  <Feedback type="invalid">{errors.email}</Feedback>
                </div>

                <div className="mb-3">
                  <FormLabel htmlFor="signupPasswordInput">
                    Password <span className="text-danger">*</span>
                  </FormLabel>
                  <div className="position-relative">
                    <FormControl
                      type={showPassword ? "text" : "password"}
                      id="signupPasswordInput"
                      name="password"
                      value={formData.password}
                      onChange={handleChange}
                      isInvalid={!!errors.password}
                    />
                    <span
                      style={{ position: "absolute", right: "10px", top: "50%", cursor: "pointer", transform: "translateY(-50%)" }}
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <IconEye size={18} /> : <IconEyeOff size={18} />}
                    </span>
                    <Feedback type="invalid">{errors.password}</Feedback>
                  </div>
                </div>

                {/* Hidden role = ADMIN */}
                <input type="hidden" name="role" value="ADMIN" />

                <div className="d-grid">
                  <Button variant="warning" type="submit">
                    Sign UP as Admin
                  </Button>
                </div>
              </Form>
            </CardBody>
          </Card>
        </Col>
      </Row>
    </Fragment>
  );
};

export default SignUp;
