"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Icon, I } from "@/components/primitives";
import { COLLECTIONS, COLLECTION_BY_KEY } from "@/components/website/collections";
import { CollectionEditor } from "@/components/website/collection-editor";
import { PageHeader, SITE_URL, Tabs, pageStyle } from "@/components/website/ui";
import type { ContentCollection } from "@/lib/types";

const KEYS = COLLECTIONS.map((c) => c.key);

function ContentInner() {
  const params = useSearchParams();
  const router = useRouter();
  const fromUrl = params.get("tab");
  const [tab, setTab] = useState<ContentCollection>(KEYS.includes(fromUrl as ContentCollection) ? (fromUrl as ContentCollection) : "services");

  useEffect(() => {
    if (fromUrl && KEYS.includes(fromUrl as ContentCollection) && fromUrl !== tab) setTab(fromUrl as ContentCollection);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fromUrl]);

  const select = (k: ContentCollection) => {
    setTab(k);
    router.replace(`/website/content?tab=${k}`);
  };

  const def = COLLECTION_BY_KEY[tab];
  return (
    <div style={pageStyle}>
      <PageHeader
        title="Content"
        meta={def.label.toLowerCase()}
        actions={
          <a className="btn" href={SITE_URL} target="_blank" rel="noreferrer">
            <Icon d={I.globe} size={12} /> Open site
          </a>
        }
      />
      <Tabs value={tab} onChange={select} tabs={COLLECTIONS.map((c) => [c.key, c.label] as [ContentCollection, string])} />
      <CollectionEditor key={tab} def={def} />
    </div>
  );
}

export default function WebsiteContentPage() {
  return (
    <Suspense fallback={null}>
      <ContentInner />
    </Suspense>
  );
}
