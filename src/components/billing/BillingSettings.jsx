import { useBillingStore } from '../../store/billingStore.js';
import { format } from 'date-fns';
import { Badge } from '../ui/Badge.jsx';
import { Button } from '../ui/Button.jsx';
import { useNavigate } from 'react-router-dom';

const planColors = { free: 'gray', starter: 'blue', pro: 'purple', biz: 'green' };

export function BillingSettings() {
  const { subscription } = useBillingStore();
  const navigate = useNavigate();

  if (!subscription) return <p className="text-gray-500 text-sm">Memuatkan...</p>;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Badge color={planColors[subscription.plan] || 'gray'} className="capitalize text-sm px-3 py-1">
          {subscription.plan}
        </Badge>
        <Badge color={subscription.status === 'active' ? 'green' : 'red'}>
          {subscription.status === 'active' ? 'Aktif' : 'Tidak Aktif'}
        </Badge>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-gray-50 rounded-lg p-4">
          <p className="text-sm text-gray-500">Sesi Digunakan</p>
          <p className="text-2xl font-bold text-gray-900">
            {subscription.sessions_used}
            <span className="text-sm font-normal text-gray-500">
              /{subscription.sessions_limit === -1 ? '∞' : subscription.sessions_limit}
            </span>
          </p>
        </div>
        {subscription.next_billing_date && (
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-sm text-gray-500">Tarikh Bil Seterusnya</p>
            <p className="text-lg font-semibold text-gray-900">
              {format(new Date(subscription.next_billing_date), 'dd MMM yyyy')}
            </p>
          </div>
        )}
      </div>

      <Button variant="outline" onClick={() => navigate('/pricing')}>
        Tukar Pelan
      </Button>
    </div>
  );
}
