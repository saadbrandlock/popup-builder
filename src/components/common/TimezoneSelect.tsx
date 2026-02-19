import { Select, SelectProps } from 'antd';
import timezoneList from 'timezones-list';

const filterOption = (
  input: string,
  option?: { label: string; value: string }
) => {
  if (!option?.label) return false;
  return option.label.toLowerCase().includes(input.toLowerCase());
};

const timezoneOptions = timezoneList.map((tz) => ({
  label: tz.name,
  value: JSON.stringify({
    offset: tz.utc,
    value: tz.tzCode,
  }),
}));

export const TimezoneSelect = (props: SelectProps) => (
  <Select
    {...props}
    filterOption={filterOption}
    showSearch
    allowClear
    options={timezoneOptions}
  />
);
