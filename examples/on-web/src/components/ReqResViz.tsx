import { FC } from 'react';
import { create } from 'zustand';

export type RequestResponseData = {
  type: 'request' | 'response';
  name: string;
};

export const useStore = create<{
  data: Array<RequestResponseData>;
}>(() => ({
  data: [],
}));

const RequestResponseList: FC = () => {
  const data = useStore((state) => state.data);
  return (
    <div className="shadow-md rounded-md p-4 h-64 w-full overflow-y-auto border-2 border-gray-200">
      {data.length === 0 ? (
        <p className="text-center text-gray-500">No requests or responses yet.</p>
      ) : (
        data.map((item, index) => (
          <div
            key={index}
            className={`${
              item.type === 'request' ? 'bg-blue-200' : 'bg-green-200'
            } p-2 mb-2 rounded-md`}
          >
            <span className="font-semibold">{item.type.toUpperCase()}:</span> {item.name}
          </div>
        ))
      )}
    </div>
  );
};

export default RequestResponseList;
