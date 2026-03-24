import { supabase } from './supabase';
import type { Musician, Performance, PerformanceWithAttendees, Instrument } from './supabase';

export const api = {
  musicians: {
    async getAll(instrument?: string, sortByPlays?: 'asc' | 'desc'): Promise<Musician[]> {
      let query = supabase
        .from('musicians')
        .select(`
          *,
          attendance(performance_id)
        `);

      const { data, error } = await query;

      if (error) throw error;

      const musicianIds = data.map(m => m.id);

      const { data: musicianInstruments, error: instError } = await supabase
        .from('musician_instruments')
        .select(`
          musician_id,
          instruments(id, name)
        `)
        .in('musician_id', musicianIds);

      if (instError) throw instError;

      const instrumentsByMusician = musicianInstruments.reduce((acc: any, mi: any) => {
        if (!acc[mi.musician_id]) {
          acc[mi.musician_id] = [];
        }
        acc[mi.musician_id].push(mi.instruments);
        return acc;
      }, {});

      let musiciansWithCount = data.map(musician => ({
        ...musician,
        times_played: musician.attendance?.length || 0,
        attendance: undefined,
        instruments: instrumentsByMusician[musician.id] || [],
      }));

      if (instrument) {
        musiciansWithCount = musiciansWithCount.filter(m =>
          m.instruments.some((i: Instrument) => i.name === instrument)
        );
      }

      if (sortByPlays) {
        musiciansWithCount.sort((a, b) => {
          return sortByPlays === 'asc'
            ? a.times_played - b.times_played
            : b.times_played - a.times_played;
        });
      }

      return musiciansWithCount;
    },

    async create(musician: Omit<Musician, 'id' | 'user_id' | 'created_at' | 'times_played'> & { instrumentIds?: string[] }): Promise<Musician> {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { instrumentIds, instruments, ...musicianData } = musician as any;

      const { data, error } = await supabase
        .from('musicians')
        .insert([{ ...musicianData, user_id: user.id }])
        .select()
        .single();

      if (error) throw error;

      if (instrumentIds && instrumentIds.length > 0) {
        const musicianInstruments = instrumentIds.map(instrumentId => ({
          musician_id: data.id,
          instrument_id: instrumentId,
        }));

        const { error: instError } = await supabase
          .from('musician_instruments')
          .insert(musicianInstruments);

        if (instError) throw instError;
      }

      return data;
    },

    async update(id: string, musician: Partial<Omit<Musician, 'id' | 'user_id' | 'created_at'>> & { instrumentIds?: string[] }): Promise<Musician> {
      const { instrumentIds, instruments, ...musicianData } = musician as any;

      const { data, error } = await supabase
        .from('musicians')
        .update(musicianData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      if (instrumentIds !== undefined) {
        await supabase
          .from('musician_instruments')
          .delete()
          .eq('musician_id', id);

        if (instrumentIds.length > 0) {
          const musicianInstruments = instrumentIds.map(instrumentId => ({
            musician_id: id,
            instrument_id: instrumentId,
          }));

          const { error: instError } = await supabase
            .from('musician_instruments')
            .insert(musicianInstruments);

          if (instError) throw instError;
        }
      }

      return data;
    },

    async delete(id: string): Promise<void> {
      const musician = await this.getById(id);

      if (musician.photo_url) {
        const fileName = musician.photo_url.split('/').pop();
        if (fileName) {
          await supabase.storage
            .from('musician-photos')
            .remove([fileName]);
        }
      }

      const { error } = await supabase
        .from('musicians')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },

    async getById(id: string): Promise<Musician> {
      const { data, error } = await supabase
        .from('musicians')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      return data;
    },

    async uploadPhoto(file: File): Promise<string> {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(2)}-${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('musician-photos')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from('musician-photos')
        .getPublicUrl(fileName);

      return data.publicUrl;
    },
  },

  performances: {
    async getAll(): Promise<Performance[]> {
      const { data, error } = await supabase
        .from('performances')
        .select(`
          *,
          attendance(
            musician_id,
            guest_name,
            musicians(id, name, photo_url)
          ),
          musician_payments(
            musician_id,
            amount,
            is_paid,
            vehicle_payment
          )
        `)
        .order('date', { ascending: false });

      if (error) throw error;
      return data;
    },

    async create(performance: {
      name: string;
      date: string;
      location?: string | null;
      planned_musicians?: number;
      is_paid?: boolean;
      payment_amount?: number | null;
      total_amount?: number;
      payment_collected?: boolean;
      default_payment_amount?: number;
      attendees: Array<{ type: 'musician'; id: string; instrumentId?: string } | { type: 'guest'; name: string; instrument?: string }>
    }): Promise<Performance> {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data: newPerformance, error: perfError } = await supabase
        .from('performances')
        .insert([{
          name: performance.name,
          date: performance.date,
          location: performance.location || null,
          planned_musicians: performance.planned_musicians || 0,
          is_paid: performance.is_paid || false,
          payment_amount: performance.payment_amount || null,
          total_amount: performance.total_amount || 0,
          payment_collected: performance.payment_collected || false,
          default_payment_amount: performance.default_payment_amount || 0,
          user_id: user.id
        }])
        .select()
        .single();

      if (perfError) throw perfError;

      if (performance.attendees.length > 0) {
        const attendanceRecords = performance.attendees.map(attendee => {
          if (attendee.type === 'musician') {
            return {
              performance_id: newPerformance.id,
              musician_id: attendee.id,
              selected_instrument_id: attendee.instrumentId || null,
            };
          } else {
            return {
              performance_id: newPerformance.id,
              guest_name: attendee.name,
              guest_instrument: attendee.instrument || null,
            };
          }
        });

        const { error: attError } = await supabase
          .from('attendance')
          .insert(attendanceRecords);

        if (attError) throw attError;

        // Auto-assign default payment amount to musicians
        if (performance.default_payment_amount && performance.default_payment_amount > 0) {
          const musicianPayments = performance.attendees
            .filter(att => att.type === 'musician' && att.id)
            .map(att => ({
              performance_id: newPerformance.id,
              musician_id: att.id,
              amount: performance.default_payment_amount,
              is_paid: false,
            }));

          if (musicianPayments.length > 0) {
            const { error: paymentError } = await supabase
              .from('musician_payments')
              .insert(musicianPayments);

            if (paymentError) throw paymentError;
          }
        }
      }

      return newPerformance;
    },

    async getById(id: string): Promise<PerformanceWithAttendees> {
      const { data: performance, error: perfError } = await supabase
        .from('performances')
        .select('*')
        .eq('id', id)
        .single();

      if (perfError) throw perfError;

      const { data: attendance, error: attError } = await supabase
        .from('attendance')
        .select(`
          musician_id,
          guest_name,
          guest_instrument,
          selected_instrument_id,
          musicians (*)
        `)
        .eq('performance_id', id);

      if (attError) throw attError;

      const musicianIds = attendance
        .filter((att: any) => att.musician_id)
        .map((att: any) => att.musician_id);

      let instrumentsByMusician: any = {};
      if (musicianIds.length > 0) {
        const { data: musicianInstruments, error: instError } = await supabase
          .from('musician_instruments')
          .select(`
            musician_id,
            instruments(id, name)
          `)
          .in('musician_id', musicianIds);

        if (instError) throw instError;

        instrumentsByMusician = musicianInstruments.reduce((acc: any, mi: any) => {
          if (!acc[mi.musician_id]) {
            acc[mi.musician_id] = [];
          }
          acc[mi.musician_id].push(mi.instruments);
          return acc;
        }, {});
      }

      const attendees = attendance.map((att: any) => {
        if (att.musician_id) {
          return {
            type: 'musician',
            ...att.musicians,
            instrumentId: att.selected_instrument_id,
            instruments: instrumentsByMusician[att.musician_id] || [],
          };
        } else {
          return {
            type: 'guest',
            name: att.guest_name,
            instrument: att.guest_instrument,
          };
        }
      });

      return {
        ...performance,
        attendees,
      };
    },

    async update(id: string, performance: {
      name: string;
      date: string;
      location?: string | null;
      planned_musicians?: number;
      is_paid?: boolean;
      payment_amount?: number | null;
      total_amount?: number;
      payment_collected?: boolean;
      default_payment_amount?: number;
      attendees: Array<{ type: 'musician'; id: string; instrumentId?: string } | { type: 'guest'; name: string; instrument?: string }>
    }): Promise<Performance> {
      const { data: updatedPerformance, error: perfError } = await supabase
        .from('performances')
        .update({
          name: performance.name,
          date: performance.date,
          location: performance.location,
          planned_musicians: performance.planned_musicians,
          is_paid: performance.is_paid,
          payment_amount: performance.payment_amount,
          total_amount: performance.total_amount,
          payment_collected: performance.payment_collected,
          default_payment_amount: performance.default_payment_amount,
        })
        .eq('id', id)
        .select()
        .single();

      if (perfError) throw perfError;

      // Get existing musicians with payments
      const { data: existingPayments } = await supabase
        .from('musician_payments')
        .select('musician_id')
        .eq('performance_id', id);

      const existingMusicianIds = new Set(existingPayments?.map(p => p.musician_id) || []);

      const { error: deleteError } = await supabase
        .from('attendance')
        .delete()
        .eq('performance_id', id);

      if (deleteError) throw deleteError;

      if (performance.attendees.length > 0) {
        const attendanceRecords = performance.attendees.map(attendee => {
          if (attendee.type === 'musician') {
            return {
              performance_id: id,
              musician_id: attendee.id,
              selected_instrument_id: attendee.instrumentId || null,
            };
          } else {
            return {
              performance_id: id,
              guest_name: attendee.name,
              guest_instrument: attendee.instrument || null,
            };
          }
        });

        const { error: attError } = await supabase
          .from('attendance')
          .insert(attendanceRecords);

        if (attError) throw attError;

        // Auto-assign default payment amount to NEW musicians only
        if (performance.default_payment_amount && performance.default_payment_amount > 0) {
          const newMusicianPayments = performance.attendees
            .filter(att => att.type === 'musician' && att.id && !existingMusicianIds.has(att.id))
            .map(att => ({
              performance_id: id,
              musician_id: att.id,
              amount: performance.default_payment_amount,
              is_paid: false,
            }));

          if (newMusicianPayments.length > 0) {
            const { error: paymentError } = await supabase
              .from('musician_payments')
              .insert(newMusicianPayments);

            if (paymentError) throw paymentError;
          }
        }
      }

      return updatedPerformance;
    },

    async delete(id: string): Promise<void> {
      const { error } = await supabase
        .from('performances')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
  },

  instruments: {
    async getAll(): Promise<Instrument[]> {
      const { data, error } = await supabase
        .from('instruments')
        .select('*')
        .order('name', { ascending: true });

      if (error) throw error;
      return data;
    },

    async create(name: string): Promise<Instrument> {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('instruments')
        .insert([{ name, user_id: user.id }])
        .select()
        .single();

      if (error) throw error;
      return data;
    },

    async update(id: string, name: string): Promise<Instrument> {
      const { data, error } = await supabase
        .from('instruments')
        .update({ name })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },

    async delete(id: string): Promise<void> {
      const { error } = await supabase
        .from('instruments')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
  },

  payments: {
    async setMusicianPayment(performanceId: string, musicianId: string, amount: number, isPaid: boolean = false, vehiclePayment: number = 0): Promise<void> {
      const { error } = await supabase
        .from('musician_payments')
        .upsert({
          performance_id: performanceId,
          musician_id: musicianId,
          amount,
          is_paid: isPaid,
          vehicle_payment: vehiclePayment,
        }, {
          onConflict: 'performance_id,musician_id'
        });

      if (error) throw error;
    },

    async toggleMusicianPaid(performanceId: string, musicianId: string, isPaid: boolean): Promise<void> {
      const { error } = await supabase
        .from('musician_payments')
        .update({ is_paid: isPaid })
        .eq('performance_id', performanceId)
        .eq('musician_id', musicianId);

      if (error) throw error;
    },

    async getPaymentsByPerformance(performanceId: string) {
      const { data, error } = await supabase
        .from('musician_payments')
        .select(`
          *,
          musicians(id, name, photo_url)
        `)
        .eq('performance_id', performanceId);

      if (error) throw error;
      return data;
    },

    async getUnpaidPerformancesByMusician(musicianId: string) {
      const { data, error } = await supabase
        .from('musician_payments')
        .select(`
          *,
          performances(id, name, date, location)
        `)
        .eq('musician_id', musicianId)
        .eq('is_paid', false)
        .gt('amount', 0)
        .order('performances(date)', { ascending: false });

      if (error) throw error;
      return data;
    },

    async getPendingPaymentCount(musicianId: string): Promise<number> {
      const { count, error } = await supabase
        .from('musician_payments')
        .select('*', { count: 'exact', head: true })
        .eq('musician_id', musicianId)
        .eq('is_paid', false)
        .gt('amount', 0);

      if (error) throw error;
      return count || 0;
    },
  },
};
