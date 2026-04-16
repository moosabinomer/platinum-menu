'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase-client';

export default function TestPage() {
  const [result, setResult] = useState<string>('');
  const [loading, setLoading] = useState(false);

  const testSupabase = async () => {
    setLoading(true);
    try {
      // Debug: Check env vars
      const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
      setResult(`Environment Check:\n`);
      setResult(prev => prev + `NEXT_PUBLIC_SUPABASE_URL: ${url ? '✓ Set' : '✗ Missing'}\n`);
      setResult(prev => prev + `NEXT_PUBLIC_SUPABASE_ANON_KEY: ${anonKey ? '✓ Set' : '✗ Missing'}\n\n`);
      
      const supabase = createClient();
      
      // Test 1: Check if tables are accessible
      setResult('Test 1: Checking tables...\n');
      const { count: restaurantCount } = await supabase
        .from('restaurants')
        .select('*', { count: 'exact', head: true });
      setResult(prev => prev + `✓ Tables accessible. Restaurants count: ${restaurantCount || 0}\n\n`);

      // Test 2: List storage buckets
      setResult(prev => prev + 'Test 2: Checking storage buckets...\n');
      const { data: buckets, error: bucketError } = await supabase.storage.listBuckets();
      
      if (bucketError) {
        setResult(prev => prev + `✗ Bucket error: ${bucketError.message}\n\n`);
      } else {
        const bucketNames = buckets?.map(b => b.name) || [];
        setResult(prev => prev + `✓ Storage buckets: ${bucketNames.join(', ')}\n`);
        setResult(prev => prev + `✓ Has 'menus' bucket: ${bucketNames.includes('menus')}\n`);
        setResult(prev => prev + `✓ Has 'food-images' bucket: ${bucketNames.includes('food-images')}\n\n`);
      }

      // Test 3: Try to upload a test file
      setResult(prev => prev + 'Test 3: Testing file upload...\n');
      const testFile = new File(['test'], 'test.txt', { type: 'text/plain' });
      const { error: uploadError } = await supabase.storage
        .from('menus')
        .upload('test-upload.txt', testFile);
      
      if (uploadError) {
        setResult(prev => prev + `✗ Upload error: ${uploadError.message}\n`);
        setResult(prev => prev + `   Error code: ${uploadError.status}\n\n`);
      } else {
        setResult(prev => prev + `✓ Upload successful!\n\n`);
        
        // Clean up test file
        await supabase.storage.from('menus').remove(['test-upload.txt']);
      }

      setResult(prev => prev + '\n=== All tests completed ===');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setResult(prev => prev + `\n✗ FATAL ERROR: ${errorMessage}\n`);
      console.error('Test failed:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-stone-900 text-stone-100 p-8">
      <h1 className="text-3xl font-bold mb-6">Supabase Connection Test</h1>
      
      <button
        onClick={testSupabase}
        disabled={loading}
        className="mb-6 px-6 py-3 bg-amber-600 rounded-lg font-semibold hover:bg-amber-500 disabled:opacity-50"
      >
        {loading ? 'Testing...' : 'Run Tests'}
      </button>

      {result && (
        <pre className="bg-stone-800 p-4 rounded-lg overflow-auto max-h-[600px] text-sm font-mono whitespace-pre-wrap">
          {result}
        </pre>
      )}
    </div>
  );
}
