import React, { useEffect, useMemo, useState } from 'react';
import { StyleSheet, View, TouchableOpacity, ScrollView } from 'react-native';
import dayjs from 'dayjs';
import { LogIn, LogOut, Users } from 'lucide-react-native';
import { AppText } from '../../../components/app-text';
import { appColors } from '../../../const/app-colors';
import { useAppSelector } from '../../../store/hooks';
import { statsService } from '../../../services/api';

type GroupBy = 'day' | 'zone' | 'room';

interface FlatEvent {
  day: string; // YYYY-MM-DD
  zone: string;
  room: string;
  direction: 'in' | 'out';
  personKey: string;
}

interface StatRow {
  key: string;
  label: string;
  inCount: number;
  outCount: number;
  people: number;
}

const DEDUPE_MS = 60 * 1000; // gộp các lần quét liên tiếp của cùng 1 người, cùng chiều trong 60s

const GROUP_TABS: { id: GroupBy; label: string }[] = [
  { id: 'day', label: 'Theo ngày' },
  { id: 'zone', label: 'Theo khu' },
  { id: 'room', label: 'Theo phòng' },
];

export const CmsStatsTab: React.FC = () => {
  const sessions = useAppSelector(state => state.detector.sessions);
  const [groupBy, setGroupBy] = useState<GroupBy>('day');
  const [selectedDay, setSelectedDay] = useState<string>('all');

  const events = useMemo<FlatEvent[]>(() => {
    const out: FlatEvent[] = [];
    (sessions || []).forEach(sess => {
      (sess.scanHistory || []).forEach(item => {
        if (item.status !== 'present') return; // chỉ tính người đã xác minh
        const personKey = item.userId || item.id;
        const sorted = [...(item.history || [])].sort(
          (a, b) => a.epochTime - b.epochTime,
        );
        let lastDir: string | null = null;
        let lastEpoch = 0;
        sorted.forEach(ev => {
          const direction = ev.direction || 'in';
          if (direction === lastDir && ev.epochTime - lastEpoch < DEDUPE_MS) {
            lastEpoch = ev.epochTime;
            return;
          }
          lastDir = direction;
          lastEpoch = ev.epochTime;
          out.push({
            day: dayjs(ev.epochTime).format('YYYY-MM-DD'),
            zone: item.zoneName || sess.zoneName || 'Chưa phân khu',
            room: item.roomName || sess.roomName || 'Chưa phân phòng',
            direction,
            personKey,
          });
        });
      });
    });
    return out;
  }, [sessions]);

  // Dữ liệu từ server (nguồn chính). null = chưa có / lỗi → dùng dữ liệu cục bộ.
  const [remoteDays, setRemoteDays] = useState<string[] | null>(null);
  const [remoteRows, setRemoteRows] = useState<StatRow[] | null>(null);

  const tzOffset = -new Date().getTimezoneOffset();

  useEffect(() => {
    let cancelled = false;
    statsService
      .getInOutStats({ groupBy: 'day', tzOffset })
      .then(res => {
        if (!cancelled) setRemoteDays(res.data.rows.map(r => r.key));
      })
      .catch(() => {
        if (!cancelled) setRemoteDays(null);
      });
    return () => {
      cancelled = true;
    };
  }, [tzOffset, sessions]);

  useEffect(() => {
    let cancelled = false;
    const params: {
      groupBy: GroupBy;
      tzOffset: number;
      startDate?: string;
      endDate?: string;
    } = { groupBy, tzOffset };
    if (groupBy !== 'day' && selectedDay !== 'all') {
      params.startDate = dayjs(selectedDay).startOf('day').toISOString();
      params.endDate = dayjs(selectedDay).endOf('day').toISOString();
    }
    statsService
      .getInOutStats(params)
      .then(res => {
        if (cancelled) return;
        setRemoteRows(
          res.data.rows.map(r => ({
            ...r,
            label:
              groupBy === 'day' ? dayjs(r.key).format('DD/MM/YYYY') : r.label,
          })),
        );
      })
      .catch(() => {
        if (!cancelled) setRemoteRows(null);
      });
    return () => {
      cancelled = true;
    };
  }, [groupBy, selectedDay, tzOffset, sessions]);

  const localDays = useMemo(
    () => Array.from(new Set(events.map(e => e.day))).sort().reverse(),
    [events],
  );
  const days = remoteDays && remoteDays.length > 0 ? remoteDays : localDays;

  const localRows = useMemo<StatRow[]>(() => {
    const scoped =
      groupBy === 'day' || selectedDay === 'all'
        ? events
        : events.filter(e => e.day === selectedDay);
    const map = new Map<string, { r: StatRow; set: Set<string> }>();
    scoped.forEach(e => {
      const key =
        groupBy === 'day' ? e.day : groupBy === 'zone' ? e.zone : e.room;
      const label =
        groupBy === 'day' ? dayjs(e.day).format('DD/MM/YYYY') : key;
      let entry = map.get(key);
      if (!entry) {
        entry = {
          r: { key, label, inCount: 0, outCount: 0, people: 0 },
          set: new Set(),
        };
        map.set(key, entry);
      }
      if (e.direction === 'in') entry.r.inCount += 1;
      else entry.r.outCount += 1;
      entry.set.add(e.personKey);
    });
    const list = Array.from(map.values()).map(({ r, set }) => ({
      ...r,
      people: set.size,
    }));
    return groupBy === 'day'
      ? list.sort((a, b) => b.key.localeCompare(a.key))
      : list.sort((a, b) => b.inCount + b.outCount - (a.inCount + a.outCount));
  }, [events, groupBy, selectedDay]);

  const isRemote = remoteRows !== null;
  const rows = remoteRows ?? localRows;

  const totalIn = rows.reduce((s, r) => s + r.inCount, 0);
  const totalOut = rows.reduce((s, r) => s + r.outCount, 0);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.tabsRow}>
        {GROUP_TABS.map(t => {
          const active = groupBy === t.id;
          return (
            <TouchableOpacity
              key={t.id}
              style={[styles.tab, active && styles.tabActive]}
              onPress={() => setGroupBy(t.id)}
            >
              <AppText style={[styles.tabText, active && styles.tabTextActive]}>
                {t.label}
              </AppText>
            </TouchableOpacity>
          );
        })}
      </View>

      {groupBy !== 'day' && days.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.dayChips}
        >
          {['all', ...days].map(d => {
            const active = selectedDay === d;
            return (
              <TouchableOpacity
                key={d}
                style={[styles.chip, active && styles.chipActive]}
                onPress={() => setSelectedDay(d)}
              >
                <AppText
                  style={[styles.chipText, active && styles.chipTextActive]}
                >
                  {d === 'all' ? 'Tất cả ngày' : dayjs(d).format('DD/MM')}
                </AppText>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}

      <AppText style={styles.sourceText}>
        {isRemote ? 'Nguồn: máy chủ (đồng bộ)' : 'Nguồn: dữ liệu trên máy (offline)'}
      </AppText>

      <View style={styles.kpiRow}>
        <View style={[styles.kpi, { backgroundColor: appColors.emerald50 }]}>
          <LogIn size={16} color={appColors.emerald700} />
          <AppText style={[styles.kpiVal, { color: appColors.emerald700 }]}>
            {totalIn}
          </AppText>
          <AppText style={styles.kpiLabel}>Lượt VÀO</AppText>
        </View>
        <View style={[styles.kpi, { backgroundColor: appColors.red50 }]}>
          <LogOut size={16} color={appColors.red700} />
          <AppText style={[styles.kpiVal, { color: appColors.red700 }]}>
            {totalOut}
          </AppText>
          <AppText style={styles.kpiLabel}>Lượt RA</AppText>
        </View>
      </View>

      {rows.length === 0 ? (
        <View style={styles.empty}>
          <AppText style={styles.emptyText}>
            Chưa có dữ liệu quét. Hãy chạy một phiên quét và chọn chốt VÀO/RA.
          </AppText>
        </View>
      ) : (
        rows.map(r => (
          <View key={r.key} style={styles.row}>
            <View style={{ flex: 1, minWidth: 0 }}>
              <AppText style={styles.rowLabel} numberOfLines={1}>
                {r.label}
              </AppText>
              <View style={styles.rowMeta}>
                <Users size={12} color={appColors.slate400} />
                <AppText style={styles.rowMetaText}>{r.people} người</AppText>
              </View>
            </View>
            <View style={[styles.badge, { backgroundColor: appColors.emerald50 }]}>
              <AppText style={[styles.badgeText, { color: appColors.emerald700 }]}>
                IN {r.inCount}
              </AppText>
            </View>
            <View style={[styles.badge, { backgroundColor: appColors.red50 }]}>
              <AppText style={[styles.badgeText, { color: appColors.red700 }]}>
                OUT {r.outCount}
              </AppText>
            </View>
          </View>
        ))
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, gap: 12 },
  tabsRow: {
    flexDirection: 'row',
    backgroundColor: appColors.slate100,
    borderRadius: 12,
    padding: 3,
    gap: 3,
  },
  tab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 10,
  },
  tabActive: { backgroundColor: appColors.white },
  tabText: { fontSize: 13, fontWeight: '600', color: appColors.slate500 },
  tabTextActive: { color: appColors.blue600, fontWeight: '700' },
  dayChips: { gap: 8 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: appColors.slate100,
  },
  chipActive: { backgroundColor: appColors.blue600 },
  chipText: { fontSize: 12, fontWeight: '600', color: appColors.slate600 },
  chipTextActive: { color: appColors.white },
  sourceText: { fontSize: 11, color: appColors.slate400, fontWeight: '600' },
  kpiRow: { flexDirection: 'row', gap: 12 },
  kpi: {
    flex: 1,
    borderRadius: 14,
    padding: 12,
    alignItems: 'center',
    gap: 2,
  },
  kpiVal: { fontSize: 24, fontWeight: '800' },
  kpiLabel: { fontSize: 12, color: appColors.slate600, fontWeight: '600' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: appColors.white,
    borderWidth: 1,
    borderColor: appColors.slate200,
    borderRadius: 12,
    padding: 12,
  },
  rowLabel: { fontSize: 14, fontWeight: '700', color: appColors.slate800 },
  rowMeta: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  rowMetaText: { fontSize: 12, color: appColors.slate500 },
  badge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
  badgeText: { fontSize: 12, fontWeight: '800' },
  empty: { padding: 24, alignItems: 'center' },
  emptyText: { fontSize: 13, color: appColors.slate500, textAlign: 'center' },
});
