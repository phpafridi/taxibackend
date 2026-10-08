//import node modules libraries
import { Container } from "react-bootstrap";

//import custom components
import Flex from "../../components/common/Flex";

const AuthLayout = ({ children }: { children: React.ReactNode }) => {
  return (
    <html lang="en" className="expanded">
    <Flex
      tag='main'
      direction='column'
      justifyContent='center'
      className='vh-100'>
      <section>
        <Container>{children}</Container>
      </section>
    </Flex>
    </html>
  );
};

export default AuthLayout;
