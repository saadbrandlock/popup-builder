import { Col, Row, Skeleton } from 'antd';

const FieldMappingsSkeleton = () => {
  // Mimics the 2-column form layout (label + input per field)
  const placeholderCount = 6;
  return (
    <Row gutter={[16, 0]}>
      {Array.from({ length: placeholderCount }).map((_, i) => (
        <Col xs={24} md={12} key={i}>
          <div style={{ marginBottom: 16 }}>
            <Skeleton.Input
              active
              style={{ width: '40%', height: 14, marginBottom: 8 }}
            />
            <Skeleton.Input active style={{ width: '100%', height: 32 }} />
          </div>
        </Col>
      ))}
    </Row>
  );
};

export default FieldMappingsSkeleton;
