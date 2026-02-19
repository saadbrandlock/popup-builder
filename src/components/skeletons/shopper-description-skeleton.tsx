import { Card, Col, Row, Skeleton } from 'antd';

const ShopperDescriptionSkeleton = () => {
  return (
    <Card>
      <Row gutter={[16, 16]}>
        {/* Content skeleton */}
        <Col xs={24}>
          {/* Overview items skeleton */}
          {[1, 2, 3].map((item) => (
            <div key={item} className={item === 3 ? 'mb-0' : 'mb-4'}>
              <Skeleton.Input 
                style={{ width: '60%', height: 24, marginBottom: 8 }} 
                active 
              />
              <Skeleton 
                paragraph={{ 
                  rows: 2, 
                  width: ['100%', '85%'] 
                }} 
                title={false} 
                active 
              />
            </div>
          ))}
        </Col>
      </Row>
    </Card>
  );
};

export default ShopperDescriptionSkeleton