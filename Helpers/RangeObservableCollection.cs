using System;
using System.Collections.Generic;
using System.Collections.ObjectModel;
using System.Collections.Specialized;

namespace KamisamaLoader.Helpers
{
    public class RangeObservableCollection<T> : ObservableCollection<T>
    {
        private bool _suppressNotification = false;

        protected override void OnCollectionChanged(NotifyCollectionChangedEventArgs e)
        {
            if (!_suppressNotification)
                base.OnCollectionChanged(e);
        }

        public void AddRange(IEnumerable<T> list)
        {
            if (list == null) throw new ArgumentNullException(nameof(list));

            _suppressNotification = true;
            try
            {
                foreach (T item in list)
                {
                    Add(item);
                }
            }
            finally
            {
                _suppressNotification = false;
                OnCollectionChanged(new NotifyCollectionChangedEventArgs(NotifyCollectionChangedAction.Reset));
            }
        }

        public void ReplaceAll(IEnumerable<T> items)
        {
             if (items == null) throw new ArgumentNullException(nameof(items));

             _suppressNotification = true;
             try
             {
                 Clear();
                 foreach(var item in items)
                 {
                     Add(item);
                 }
             }
             finally
             {
                 _suppressNotification = false;
                 OnCollectionChanged(new NotifyCollectionChangedEventArgs(NotifyCollectionChangedAction.Reset));
             }
        }
    }
}
